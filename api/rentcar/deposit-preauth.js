/**
 * 렌트카 보증금 사전승인 API
 *
 * 기능:
 * - 체크인 시 보증금 사전승인 (Toss Payments)
 * - 보증금 금액 계산 (차량 등급별)
 * - 사전승인 기록 저장
 *
 * 라우트: POST /api/rentcar/deposit/preauth
 * 권한: 벤더, 관리자
 */

import { db } from '../../utils/database';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { booking_number, billing_key, deposit_amount } = req.body;

    if (!booking_number || !billing_key) {
      return res.status(400).json({
        success: false,
        message: '예약 번호와 빌링키가 필요합니다.'
      });
    }

    // 1. 예약 조회
    const [bookings] = await db.query(`
      SELECT
        id,
        booking_number,
        status,
        vehicle_id,
        customer_name,
        customer_email,
        total_price_krw,
        deposit_amount_krw,
        deposit_status
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

    // 2. 이미 사전승인이 완료되었는지 확인
    if (booking.deposit_status === 'preauthorized' || booking.deposit_status === 'captured') {
      return res.status(400).json({
        success: false,
        message: '이미 보증금 사전승인이 완료되었습니다.',
        data: { deposit_status: booking.deposit_status }
      });
    }

    // 3. 보증금 금액 결정 (요청값 또는 DB 값 또는 기본값)
    const finalDepositAmount = deposit_amount || booking.deposit_amount_krw || 200000; // 기본 20만원

    // 4. Toss Payments 빌링키로 사전승인 (자동결제)
    const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
    const authHeader = `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`;

    // 고유한 orderId 생성 (보증금용)
    const depositOrderId = `DEP-${booking_number}-${Date.now()}`;

    const tossPayload = {
      billingKey: billing_key,
      customerKey: `CUSTOMER-${booking.id}`,
      amount: finalDepositAmount,
      orderId: depositOrderId,
      orderName: `[보증금] ${booking.customer_name} 렌트카 예약`,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      taxFreeAmount: 0
    };

    console.log('🔑 [Deposit Preauth] Toss Payments 요청:', {
      orderId: depositOrderId,
      amount: finalDepositAmount,
      booking_number
    });

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
      console.error('❌ [Deposit Preauth] Toss 사전승인 실패:', tossResult);
      return res.status(400).json({
        success: false,
        message: '보증금 사전승인에 실패했습니다.',
        error: tossResult.message || '알 수 없는 오류'
      });
    }

    console.log('✅ [Deposit Preauth] Toss 사전승인 성공:', tossResult.paymentKey);

    // 5. 보증금 사전승인 기록 저장
    await db.execute(`
      INSERT INTO rentcar_rental_deposits
      (rental_id, deposit_amount_krw, payment_key, order_id, status, preauth_at, created_at)
      VALUES (?, ?, ?, ?, 'preauthorized', NOW(), NOW())
    `, [
      booking.id,
      finalDepositAmount,
      tossResult.paymentKey,
      depositOrderId
    ]);

    // 6. 예약 테이블 업데이트
    await db.execute(`
      UPDATE rentcar_bookings
      SET
        deposit_amount_krw = ?,
        deposit_status = 'preauthorized',
        deposit_payment_key = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [finalDepositAmount, tossResult.paymentKey, booking.id]);

    // 7. 이벤트 로그 기록
    await db.execute(`
      INSERT INTO rentcar_rental_events
      (rental_id, event_type, event_data, created_at)
      VALUES (?, 'deposit_preauth', ?, NOW())
    `, [
      booking.id,
      JSON.stringify({
        deposit_amount: finalDepositAmount,
        payment_key: tossResult.paymentKey,
        order_id: depositOrderId,
        preauth_at: new Date().toISOString()
      })
    ]);

    return res.status(200).json({
      success: true,
      message: '보증금 사전승인이 완료되었습니다.',
      data: {
        booking_number,
        deposit_amount: finalDepositAmount,
        payment_key: tossResult.paymentKey,
        order_id: depositOrderId,
        status: 'preauthorized'
      }
    });

  } catch (error) {
    console.error('❌ [Deposit Preauth] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
