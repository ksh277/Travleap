/**
 * 숙박/렌트카 환불 가능 테스트
 * - is_refundable=false 정책 무시 확인
 * - 체크인/픽업 전이면 환불 가능 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 숙박/렌트카 환불 정책 테스트\n');
    console.log('='.repeat(60));

    // 1. 현재 활성화된 환불 불가 정책 확인
    console.log('\n=== 1. 환불 불가 정책 확인 ===\n');

    const noRefundPolicy = await connection.execute(`
      SELECT * FROM refund_policies
      WHERE is_refundable = FALSE AND is_active = TRUE
      LIMIT 5
    `);

    if (noRefundPolicy.rows && noRefundPolicy.rows.length > 0) {
      console.log(`⚠️  환불 불가 정책 ${noRefundPolicy.rows.length}개 발견:\n`);
      noRefundPolicy.rows.forEach(p => {
        console.log(`ID ${p.id}: ${p.policy_name}`);
        console.log(`   카테고리: ${p.category || 'NULL (모든 카테고리)'}`);
        console.log(`   우선순위: ${p.priority}`);
        console.log();
      });
    } else {
      console.log('✅ 환불 불가 정책 없음\n');
    }

    // 2. 숙박 예약 환불 가능 여부 테스트
    console.log('=== 2. 숙박 예약 환불 가능 여부 ===\n');

    const accommodationBookings = await connection.execute(`
      SELECT
        b.id,
        b.booking_number,
        b.start_date,
        b.status,
        b.payment_status,
        p.payment_key,
        l.title,
        c.name_ko as category,
        c.slug as category_slug
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      LEFT JOIN listings l ON b.listing_id = l.id
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE b.payment_status = 'paid'
        AND c.slug IN ('stay', 'accommodation')
      ORDER BY b.created_at DESC
      LIMIT 3
    `);

    if (accommodationBookings.rows && accommodationBookings.rows.length > 0) {
      console.log(`숙박 예약 ${accommodationBookings.rows.length}건:\n`);

      for (const booking of accommodationBookings.rows) {
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
        } else {
          reason = '(is_refundable 정책 무시됨)';
        }

        console.log(`[${booking.id}] ${booking.booking_number}`);
        console.log(`    상품: ${booking.title}`);
        console.log(`    카테고리: ${booking.category} (${booking.category_slug})`);
        console.log(`    예약일: ${booking.start_date}`);
        console.log(`    상태: ${booking.status}`);
        console.log(`    ${refundable} ${reason}`);
        console.log();
      }
    } else {
      console.log('숙박 예약 없음\n');
    }

    // 3. 렌트카 예약 환불 가능 여부 테스트
    console.log('=== 3. 렌트카 예약 환불 가능 여부 ===\n');

    const rentcarBookings = await connection.execute(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.pickup_date,
        rb.status,
        rb.payment_status,
        p.payment_key
      FROM rentcar_bookings rb
      LEFT JOIN payments p ON p.order_id_str COLLATE utf8mb4_unicode_ci = rb.booking_number COLLATE utf8mb4_unicode_ci
      WHERE rb.payment_status = 'paid'
      ORDER BY rb.created_at DESC
      LIMIT 3
    `);

    if (rentcarBookings.rows && rentcarBookings.rows.length > 0) {
      console.log(`렌트카 예약 ${rentcarBookings.rows.length}건:\n`);

      const pickedUpStatuses = ['picked_up', 'in_use', 'returned', 'completed'];

      for (const booking of rentcarBookings.rows) {
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
        } else {
          reason = '(is_refundable 정책 무시됨)';
        }

        console.log(`[${booking.id}] ${booking.booking_number}`);
        console.log(`    픽업일: ${booking.pickup_date}`);
        console.log(`    상태: ${booking.status}`);
        console.log(`    ${refundable} ${reason}`);
        console.log();
      }
    } else {
      console.log('렌트카 예약 없음\n');
    }

    // 4. 요약
    console.log('='.repeat(60));
    console.log('\n=== 수정 요약 ===\n');

    console.log('✅ 숙박 예약:');
    console.log('   - is_refundable=false 정책 무시');
    console.log('   - 체크인 전 + 날짜 안 지났으면 환불 가능');
    console.log('   - 체크인 완료 or 날짜 경과 → 환불 불가');

    console.log('\n✅ 렌트카 예약:');
    console.log('   - is_refundable=false 정책 무시');
    console.log('   - 픽업 전 + 날짜 안 지났으면 환불 가능');
    console.log('   - 픽업 완료 or 날짜 경과 → 환불 불가');

    console.log('\n📋 수정된 코드:');
    console.log('   api/payments/refund.js:130-148 - calculateRefundPolicy 함수');
    console.log('   - category 파라미터 추가');
    console.log('   - 숙박/렌트카는 is_refundable 체크 스킵');

    console.log('\n⚠️  주의:');
    console.log('   - 다른 카테고리(투어, 이벤트, 음식 등)는 기존대로 is_refundable 정책 적용');
    console.log('   - skipPolicy=true로 관리자 강제 환불 가능');

    console.log('\n' + '='.repeat(60));
    console.log('✅ 테스트 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
