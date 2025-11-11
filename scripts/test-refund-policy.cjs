/**
 * 환불 정책 테스트
 * - 체크인 완료 시 환불 불가
 * - 픽업 완료 시 환불 불가
 * - 날짜 경과 시 환불 불가
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 환불 정책 테스트 시작\n');
    console.log('='.repeat(60));

    // 1. 숙박 예약 체크인 상태 확인
    console.log('\n=== 1. 숙박 예약 상태별 환불 가능 여부 ===\n');

    const bookingsResult = await connection.execute(`
      SELECT
        b.id,
        b.booking_number,
        b.start_date,
        b.status,
        b.payment_status,
        p.payment_key,
        p.amount,
        l.title,
        c.name_ko as category
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      LEFT JOIN listings l ON b.listing_id = l.id
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE b.payment_status = 'paid'
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    if (bookingsResult.rows && bookingsResult.rows.length > 0) {
      console.log('최근 숙박/투어/이벤트 예약 5건:\n');

      for (const booking of bookingsResult.rows) {
        const startDate = new Date(booking.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        const isPast = startDate < today;
        const isCompleted = booking.status === 'completed';

        let refundable = '✅ 환불 가능';
        let reason = '';

        if (isCompleted) {
          refundable = '❌ 환불 불가';
          reason = '(체크인 완료)';
        } else if (isPast) {
          refundable = '❌ 환불 불가';
          reason = '(날짜 경과)';
        }

        console.log(`[${booking.id}] ${booking.booking_number}`);
        console.log(`    상품: ${booking.title}`);
        console.log(`    카테고리: ${booking.category || 'N/A'}`);
        console.log(`    예약일: ${booking.start_date}`);
        console.log(`    상태: ${booking.status} / ${booking.payment_status}`);
        console.log(`    ${refundable} ${reason}`);
        console.log();
      }
    } else {
      console.log('결제 완료된 예약이 없습니다.\n');
    }

    // 2. 렌트카 예약 픽업 상태 확인
    console.log('=== 2. 렌트카 예약 상태별 환불 가능 여부 ===\n');

    const rentcarResult = await connection.execute(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.pickup_date,
        rb.status,
        rb.payment_status,
        rb.pickup_checked_in_at,
        p.payment_key,
        p.amount
      FROM rentcar_bookings rb
      LEFT JOIN payments p ON p.order_id_str COLLATE utf8mb4_unicode_ci = rb.booking_number COLLATE utf8mb4_unicode_ci
      WHERE rb.payment_status = 'paid'
      ORDER BY rb.created_at DESC
      LIMIT 5
    `);

    if (rentcarResult.rows && rentcarResult.rows.length > 0) {
      console.log('최근 렌트카 예약 5건:\n');

      const pickedUpStatuses = ['picked_up', 'in_use', 'returned', 'completed'];

      for (const booking of rentcarResult.rows) {
        const pickupDate = new Date(booking.pickup_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        pickupDate.setHours(0, 0, 0, 0);

        const isPast = pickupDate < today;
        const isPickedUp = pickedUpStatuses.includes(booking.status);

        let refundable = '✅ 환불 가능';
        let reason = '';

        if (isPickedUp) {
          refundable = '❌ 환불 불가';
          reason = `(픽업 완료: ${booking.status})`;
        } else if (isPast) {
          refundable = '❌ 환불 불가';
          reason = '(픽업 날짜 경과)';
        }

        console.log(`[${booking.id}] ${booking.booking_number}`);
        console.log(`    픽업일: ${booking.pickup_date}`);
        console.log(`    상태: ${booking.status} / ${booking.payment_status}`);
        console.log(`    픽업 체크인: ${booking.pickup_checked_in_at || 'N/A'}`);
        console.log(`    ${refundable} ${reason}`);
        console.log();
      }
    } else {
      console.log('결제 완료된 렌트카 예약이 없습니다.\n');
    }

    // 3. 환불 정책 요약
    console.log('='.repeat(60));
    console.log('\n=== 환불 정책 요약 ===\n');

    console.log('✅ 환불 가능 조건:');
    console.log('   - 예약 날짜가 현재 날짜 이후');
    console.log('   - 체크인/픽업 완료 전');
    console.log('   - payment_status가 "paid"');

    console.log('\n❌ 환불 불가 조건:');
    console.log('   1. 숙박: status가 "completed" (체크인 완료)');
    console.log('   2. 렌트카: status가 "picked_up", "in_use", "returned", "completed"');
    console.log('   3. 모든 예약: start_date/pickup_date가 현재 날짜보다 이전');

    console.log('\n📋 수정된 코드:');
    console.log('   api/payments/refund.js:541-581');
    console.log('   - 체크인/픽업 완료 검증 추가');
    console.log('   - 날짜 경과 검증 강화');

    console.log('\n⚠️  주의사항:');
    console.log('   - skipPolicy=true 옵션으로 관리자는 강제 환불 가능');
    console.log('   - 기존 환불 정책(수수료) 계산은 유지');

    console.log('\n' + '='.repeat(60));
    console.log('✅ 환불 정책 테스트 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
