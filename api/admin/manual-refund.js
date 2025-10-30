/**
 * 수동 환불 처리 API
 * POST /api/admin/manual-refund
 *
 * 토스 페이먼츠에서 직접 환불한 주문을 시스템에 반영
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: '주문번호가 필요합니다.'
      });
    }

    console.log(`🔍 [Manual Refund] 주문 조회: ${orderNumber}`);

    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. 주문 정보 조회
    const paymentResult = await connection.execute(`
      SELECT
        p.id,
        p.user_id,
        p.booking_id,
        p.order_id,
        p.amount,
        p.payment_status,
        p.payment_key,
        p.gateway_transaction_id
      FROM payments p
      WHERE p.gateway_transaction_id = ?
      LIMIT 1
    `, [orderNumber]);

    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      console.error(`❌ 주문을 찾을 수 없습니다: ${orderNumber}`);
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.'
      });
    }

    const payment = paymentResult.rows[0];

    console.log(`💳 [Payment] ID: ${payment.id}, Status: ${payment.payment_status}, Amount: ${payment.amount}`);

    // 이미 환불된 경우
    if (payment.payment_status === 'refunded') {
      console.log('⚠️  이미 환불된 주문입니다.');
      return res.status(400).json({
        success: false,
        message: '이미 환불된 주문입니다.'
      });
    }

    // 2. payments 테이블 업데이트
    console.log('💳 [Payments] 환불 상태로 업데이트 중...');
    await connection.execute(`
      UPDATE payments
      SET payment_status = 'refunded',
          refund_amount = ?,
          refund_reason = '토스 페이먼츠 직접 환불',
          refunded_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [payment.amount, payment.id]);

    console.log('✅ payments 테이블 업데이트 완료');

    // 3. bookings 테이블 업데이트
    let affectedBookings = 0;

    if (!payment.booking_id && orderNumber.startsWith('ORDER_')) {
      // 장바구니 주문
      console.log('📦 [Bookings] 장바구니 주문 업데이트 중...');

      const updateResult = await connection.execute(`
        UPDATE bookings
        SET status = 'cancelled',
            payment_status = 'refunded',
            cancellation_reason = '토스 페이먼츠 직접 환불',
            updated_at = NOW()
        WHERE order_number = ?
      `, [orderNumber]);

      affectedBookings = updateResult.rowsAffected || 0;
      console.log(`✅ bookings 업데이트 완료 (${affectedBookings}개)`);

    } else if (payment.booking_id) {
      // 단일 예약
      console.log('📦 [Bookings] 단일 예약 업데이트 중...');

      await connection.execute(`
        UPDATE bookings
        SET status = 'cancelled',
            payment_status = 'refunded',
            cancellation_reason = '토스 페이먼츠 직접 환불',
            updated_at = NOW()
        WHERE id = ?
      `, [payment.booking_id]);

      affectedBookings = 1;
      console.log('✅ bookings 업데이트 완료');
    }

    console.log(`✨ [완료] 환불 상태 반영 완료: ${orderNumber}, ${payment.amount}원`);

    return res.status(200).json({
      success: true,
      message: '환불 상태가 반영되었습니다.',
      data: {
        orderNumber,
        paymentId: payment.id,
        refundAmount: payment.amount,
        affectedBookings
      }
    });

  } catch (error) {
    console.error('❌ [Manual Refund] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '환불 처리 중 오류가 발생했습니다.'
    });
  }
};
