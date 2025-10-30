/**
 * 토스 페이먼츠에서 직접 환불된 주문을 시스템에 반영하는 스크립트
 *
 * 사용법: node scripts/manual-refund-order.cjs ORDER_1761781537358_6984
 */

const { connect } = require('@planetscale/database');
require('dotenv').config({ path: '.env.local' });

async function manualRefundOrder(orderNumber) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log(`🔍 [Manual Refund] 주문 조회: ${orderNumber}\n`);

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
        p.gateway_transaction_id,
        p.notes
      FROM payments p
      WHERE p.gateway_transaction_id = ?
      LIMIT 1
    `, [orderNumber]);

    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      console.error(`❌ 주문을 찾을 수 없습니다: ${orderNumber}`);
      return;
    }

    const payment = paymentResult.rows[0];

    console.log('📦 [주문 정보]');
    console.log(`  - Payment ID: ${payment.id}`);
    console.log(`  - User ID: ${payment.user_id}`);
    console.log(`  - Amount: ${payment.amount}원`);
    console.log(`  - Current Status: ${payment.payment_status}`);
    console.log(`  - Payment Key: ${payment.payment_key}`);
    console.log('');

    // 이미 환불된 경우
    if (payment.payment_status === 'refunded') {
      console.log('⚠️  이미 환불된 주문입니다.');
      return;
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

    // 3. bookings 테이블 업데이트 (장바구니 주문의 경우)
    if (!payment.booking_id && orderNumber.startsWith('ORDER_')) {
      // 장바구니 주문: order_number로 찾기
      console.log('📦 [Bookings] 장바구니 주문 bookings 업데이트 중...');

      const updateResult = await connection.execute(`
        UPDATE bookings
        SET status = 'cancelled',
            payment_status = 'refunded',
            cancellation_reason = '토스 페이먼츠 직접 환불',
            updated_at = NOW()
        WHERE order_number = ?
      `, [orderNumber]);

      const affectedRows = updateResult.rowsAffected || 0;
      console.log(`✅ bookings 테이블 업데이트 완료 (${affectedRows}개 예약)`);

    } else if (payment.booking_id) {
      // 단일 예약
      console.log('📦 [Bookings] 단일 예약 booking 업데이트 중...');

      await connection.execute(`
        UPDATE bookings
        SET status = 'cancelled',
            payment_status = 'refunded',
            cancellation_reason = '토스 페이먼츠 직접 환불',
            updated_at = NOW()
        WHERE id = ?
      `, [payment.booking_id]);

      console.log('✅ bookings 테이블 업데이트 완료');
    }

    // 4. 완료 메시지
    console.log('');
    console.log('✨ [완료] 환불 상태 반영 완료!');
    console.log('');
    console.log('📋 업데이트 내용:');
    console.log(`  - 주문번호: ${orderNumber}`);
    console.log(`  - 환불 금액: ${payment.amount}원`);
    console.log(`  - 상태: paid → refunded`);
    console.log(`  - 환불 사유: 토스 페이먼츠 직접 환불`);
    console.log('');

  } catch (error) {
    console.error('❌ [Error] 환불 처리 중 오류:', error);
    throw error;
  }
}

// 명령줄 인자에서 주문번호 가져오기
const orderNumber = process.argv[2];

if (!orderNumber) {
  console.error('❌ 사용법: node scripts/manual-refund-order.cjs <주문번호>');
  console.error('   예시: node scripts/manual-refund-order.cjs ORDER_1761781537358_6984');
  process.exit(1);
}

manualRefundOrder(orderNumber)
  .then(() => {
    console.log('🎉 처리 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 처리 실패:', error);
    process.exit(1);
  });
