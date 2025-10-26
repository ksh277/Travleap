/**
 * 렌트카 보증금 정산 API
 *
 * 기능:
 * - 체크아웃 시 추가 비용 계산 (연체료 + 손상비 + 기타)
 * - 보증금에서 추가 비용 차감
 * - 보증금 부족 시 추가 결제 요청
 * - 남은 보증금 환불
 *
 * 라우트: POST /api/rentcar/deposit/settle
 * 권한: 벤더, 관리자
 */

import db from '../../utils/db.js';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      booking_number,
      late_return_fee = 0,
      damage_fee = 0,
      other_fees = 0,
      notes
    } = req.body;

    if (!booking_number) {
      return res.status(400).json({
        success: false,
        message: '예약 번호가 필요합니다.'
      });
    }

    console.log(`💰 [Deposit Settle] 보증금 정산 시작: ${booking_number}`);

    // 1. 예약 및 보증금 정보 조회
    const [bookings] = await db.query(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.status,
        rb.customer_name,
        rb.customer_email,
        rb.deposit_amount_krw,
        rb.deposit_status,
        rb.deposit_payment_key,
        rb.late_return_fee_krw,
        rd.id as deposit_id,
        rd.payment_key as deposit_payment_key_from_table,
        rd.status as deposit_table_status
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_rental_deposits rd ON rb.id = rd.rental_id AND rd.status = 'preauthorized'
      WHERE rb.booking_number = ?
      LIMIT 1
    `, [booking_number]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: '예약을 찾을 수 없습니다.'
      });
    }

    const booking = bookings[0];

    // 2. 보증금 사전승인 확인
    if (!booking.deposit_payment_key && !booking.deposit_payment_key_from_table) {
      return res.status(400).json({
        success: false,
        message: '사전승인된 보증금이 없습니다.',
        hint: '먼저 체크인 시 보증금 사전승인을 진행하세요.'
      });
    }

    const depositPaymentKey = booking.deposit_payment_key || booking.deposit_payment_key_from_table;
    const depositAmount = booking.deposit_amount_krw || 0;

    // 3. 총 추가 비용 계산
    const totalAdditionalFee = late_return_fee + damage_fee + other_fees;

    console.log(`   💵 보증금: ${depositAmount.toLocaleString()}원`);
    console.log(`   🚨 총 추가 비용: ${totalAdditionalFee.toLocaleString()}원`);
    console.log(`   - 연체료: ${late_return_fee.toLocaleString()}원`);
    console.log(`   - 손상비: ${damage_fee.toLocaleString()}원`);
    console.log(`   - 기타: ${other_fees.toLocaleString()}원`);

    const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
    const authHeader = `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`;

    let settlementResult = {
      deposit_captured: 0,
      deposit_refunded: 0,
      additional_payment_required: 0,
      status: ''
    };

    // 4. 보증금 정산 로직
    if (totalAdditionalFee === 0) {
      // 🎉 추가 비용 없음 → 보증금 전액 환불
      console.log('   ✅ 추가 비용 없음 → 보증금 전액 환불');

      const cancelResponse = await fetch(`https://api.tosspayments.com/v1/payments/${depositPaymentKey}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancelReason: '정상 반납 - 보증금 전액 환불',
          cancelAmount: depositAmount
        })
      });

      const cancelResult = await cancelResponse.json();

      if (!cancelResponse.ok) {
        console.error('❌ 보증금 환불 실패:', cancelResult);
        throw new Error('보증금 환불에 실패했습니다: ' + cancelResult.message);
      }

      settlementResult = {
        deposit_captured: 0,
        deposit_refunded: depositAmount,
        additional_payment_required: 0,
        status: 'refunded'
      };

      // 보증금 테이블 업데이트
      if (booking.deposit_id) {
        await db.execute(`
          UPDATE rentcar_rental_deposits
          SET status = 'refunded', refunded_at = NOW(), refund_amount_krw = ?, updated_at = NOW()
          WHERE id = ?
        `, [depositAmount, booking.deposit_id]);
      }

    } else if (totalAdditionalFee <= depositAmount) {
      // 💳 보증금 >= 추가 비용 → 보증금에서 차감 + 남은 금액 환불
      console.log('   💳 보증금에서 차감 + 남은 금액 환불');

      const captureAmount = totalAdditionalFee;
      const refundAmount = depositAmount - totalAdditionalFee;

      // Toss는 사전승인 전액을 승인하고, 나머지를 취소하는 방식
      // 또는 부분 취소 사용

      // 방법 1: 전액 승인 후 부분 환불
      // 방법 2: 필요한 만큼만 승인하고 나머지 취소

      // 여기서는 부분 취소 사용 (나머지 금액 취소 = 환불)
      const cancelResponse = await fetch(`https://api.tosspayments.com/v1/payments/${depositPaymentKey}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancelReason: `추가 비용 차감 (연체료: ${late_return_fee}, 손상비: ${damage_fee}) - 남은 금액 환불`,
          cancelAmount: refundAmount,
          taxFreeAmount: 0
        })
      });

      const cancelResult = await cancelResponse.json();

      if (!cancelResponse.ok) {
        console.error('❌ 부분 환불 실패:', cancelResult);
        throw new Error('부분 환불에 실패했습니다: ' + cancelResult.message);
      }

      settlementResult = {
        deposit_captured: captureAmount,
        deposit_refunded: refundAmount,
        additional_payment_required: 0,
        status: 'partial_refunded'
      };

      // 보증금 테이블 업데이트
      if (booking.deposit_id) {
        await db.execute(`
          UPDATE rentcar_rental_deposits
          SET status = 'partial_captured', captured_at = NOW(), captured_amount_krw = ?, refund_amount_krw = ?, updated_at = NOW()
          WHERE id = ?
        `, [captureAmount, refundAmount, booking.deposit_id]);
      }

    } else {
      // 🚨 보증금 < 추가 비용 → 보증금 전액 차감 + 추가 결제 필요
      console.log('   🚨 보증금 부족 → 전액 차감 + 추가 결제 필요');

      const additionalPaymentNeeded = totalAdditionalFee - depositAmount;

      // 보증금 전액 승인 (취소하지 않음 = 전액 승인됨)
      // Toss는 사전승인된 금액을 자동으로 승인함 (별도 capture API 호출 불필요)

      settlementResult = {
        deposit_captured: depositAmount,
        deposit_refunded: 0,
        additional_payment_required: additionalPaymentNeeded,
        status: 'additional_payment_required'
      };

      // 보증금 테이블 업데이트
      if (booking.deposit_id) {
        await db.execute(`
          UPDATE rentcar_rental_deposits
          SET status = 'fully_captured', captured_at = NOW(), captured_amount_krw = ?, updated_at = NOW()
          WHERE id = ?
        `, [depositAmount, booking.deposit_id]);
      }

      console.log(`   ⚠️  추가 결제 필요: ${additionalPaymentNeeded.toLocaleString()}원`);
    }

    // 5. 예약 테이블 업데이트
    await db.execute(`
      UPDATE rentcar_bookings
      SET
        deposit_status = ?,
        late_return_fee_krw = ?,
        total_additional_fee_krw = ?,
        deposit_settlement_notes = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      settlementResult.status,
      late_return_fee,
      totalAdditionalFee,
      notes || '',
      booking.id
    ]);

    // 6. 이벤트 로그 기록
    await db.execute(`
      INSERT INTO rentcar_rental_events
      (rental_id, event_type, event_data, created_at)
      VALUES (?, 'deposit_settled', ?, NOW())
    `, [
      booking.id,
      JSON.stringify({
        ...settlementResult,
        late_return_fee,
        damage_fee,
        other_fees,
        total_additional_fee: totalAdditionalFee,
        deposit_amount: depositAmount,
        notes,
        settled_at: new Date().toISOString()
      })
    ]);

    console.log(`✅ [Deposit Settle] 보증금 정산 완료: ${booking_number}`);

    return res.status(200).json({
      success: true,
      message: '보증금 정산이 완료되었습니다.',
      data: {
        booking_number,
        deposit_amount: depositAmount,
        total_additional_fee: totalAdditionalFee,
        ...settlementResult,
        breakdown: {
          late_return_fee,
          damage_fee,
          other_fees
        }
      }
    });

  } catch (error) {
    console.error('❌ [Deposit Settle] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '보증금 정산 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}
