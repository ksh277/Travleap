/**
 * 렌트카 추가 결제 API
 *
 * 사용 케이스:
 * 1. 보증금이 추가 비용보다 부족한 경우
 * 2. 보증금이 없는 단기 렌트에서 추가 비용 발생 시
 * 3. 벤더가 현장에서 추가 비용 청구
 *
 * 라우트: POST /api/rentcar/additional-payment
 * 권한: 벤더, 관리자, 고객 (본인)
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
      payment_method = 'card', // card, cash, billing
      payment_key, // Toss billing key (자동결제용)
      customer_key,
      amount,
      reason,
      breakdown // { late_fee: 30000, damage_fee: 50000, other: 10000 }
    } = req.body;

    if (!booking_number || !amount) {
      return res.status(400).json({
        success: false,
        message: '예약 번호와 결제 금액이 필요합니다.'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '결제 금액은 0보다 커야 합니다.'
      });
    }

    console.log(`💳 [Additional Payment] 추가 결제 시작: ${booking_number}, ${amount.toLocaleString()}원`);

    // 1. 예약 조회
    const [bookings] = await db.query(`
      SELECT
        id,
        booking_number,
        status,
        customer_name,
        customer_email,
        total_price_krw,
        deposit_amount_krw,
        late_return_fee_krw,
        total_additional_fee_krw
      FROM rentcar_bookings
      WHERE booking_number = ?
      LIMIT 1
    `, [booking_number]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: '예약을 찾을 수 없습니다.'
      });
    }

    const booking = bookings[0];

    // 2. 결제 방법별 처리
    let paymentResult = null;

    if (payment_method === 'card' || payment_method === 'billing') {
      // Toss Payments 빌링키 자동결제
      if (!payment_key || !customer_key) {
        return res.status(400).json({
          success: false,
          message: '카드 결제에는 payment_key와 customer_key가 필요합니다.'
        });
      }

      const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
      const authHeader = `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`;

      const additionalOrderId = `ADD-${booking_number}-${Date.now()}`;

      const tossPayload = {
        billingKey: payment_key,
        customerKey: customer_key,
        amount: amount,
        orderId: additionalOrderId,
        orderName: `[추가 비용] ${booking.customer_name} - ${reason || '연체료 및 손상비'}`,
        customerEmail: booking.customer_email,
        customerName: booking.customer_name
      };

      console.log('   💳 Toss Payments 자동결제 요청...');

      const tossResponse = await fetch('https://api.tosspayments.com/v1/billing/pay', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tossPayload)
      });

      const tossResult = await tossResponse.json();

      if (!tossResponse.ok) {
        console.error('   ❌ 자동결제 실패:', tossResult);
        return res.status(400).json({
          success: false,
          message: '추가 결제에 실패했습니다.',
          error: tossResult.message
        });
      }

      console.log('   ✅ 자동결제 성공:', tossResult.paymentKey);

      paymentResult = {
        payment_method: 'card',
        payment_key: tossResult.paymentKey,
        order_id: additionalOrderId,
        amount: amount,
        paid_at: tossResult.approvedAt
      };

    } else if (payment_method === 'cash') {
      // 현금 결제 (벤더 현장 수령)
      console.log('   💵 현금 결제 기록');

      paymentResult = {
        payment_method: 'cash',
        amount: amount,
        paid_at: new Date().toISOString()
      };

    } else {
      return res.status(400).json({
        success: false,
        message: '지원하지 않는 결제 방법입니다. (card, billing, cash만 가능)'
      });
    }

    // 3. 추가 결제 기록 저장
    await db.execute(`
      INSERT INTO rentcar_rental_payments
      (rental_id, payment_type, payment_method, amount_krw, payment_key, order_id, status, paid_at, created_at)
      VALUES (?, 'additional', ?, ?, ?, ?, 'captured', ?, NOW())
    `, [
      booking.id,
      payment_method,
      amount,
      paymentResult.payment_key || null,
      paymentResult.order_id || null,
      paymentResult.paid_at
    ]);

    // 4. 예약 테이블 업데이트 (총 추가 비용 누적)
    const currentAdditionalFee = booking.total_additional_fee_krw || 0;
    const newTotalAdditionalFee = currentAdditionalFee + amount;

    await db.execute(`
      UPDATE rentcar_bookings
      SET
        total_additional_fee_krw = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [newTotalAdditionalFee, booking.id]);

    // 5. 이벤트 로그 기록
    await db.execute(`
      INSERT INTO rentcar_rental_events
      (rental_id, event_type, event_data, created_at)
      VALUES (?, 'additional_payment', ?, NOW())
    `, [
      booking.id,
      JSON.stringify({
        ...paymentResult,
        reason,
        breakdown,
        paid_at: new Date().toISOString()
      })
    ]);

    console.log(`✅ [Additional Payment] 추가 결제 완료: ${amount.toLocaleString()}원`);

    return res.status(200).json({
      success: true,
      message: '추가 결제가 완료되었습니다.',
      data: {
        booking_number,
        ...paymentResult,
        breakdown,
        total_additional_fee: newTotalAdditionalFee
      }
    });

  } catch (error) {
    console.error('❌ [Additional Payment] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '추가 결제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}
