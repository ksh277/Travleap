/**
 * 벤더 대시보드 결제/환불 내역 표시 검증 스크립트
 *
 * 검증 항목:
 * 1. /api/vendor/bookings 조회 - payment_status='paid'만 조회하는지 확인
 * 2. /api/vendor/revenue 계산 - status 필터 확인
 * 3. 실제 DB의 환불 건(payment_status='refunded') 확인
 * 4. 프론트엔드 통계 계산 로직 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkVendorDashboardPayments() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 벤더 대시보드 결제/환불 내역 검증');
  console.log('='.repeat(80) + '\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 모든 예약 데이터 조회 (payment_status별 분류)
    console.log('📊 1. 전체 예약 데이터 현황 (payment_status별)');
    console.log('-'.repeat(80));

    const allBookings = await connection.execute(`
      SELECT
        payment_status,
        status,
        COUNT(*) as count,
        SUM(total_krw) as total_amount,
        SUM(COALESCE(refund_amount_krw, 0)) as total_refund
      FROM rentcar_bookings
      GROUP BY payment_status, status
      ORDER BY payment_status, status
    `);

    console.log('\n현재 DB 상태:');
    console.table(allBookings.rows.map(row => ({
      'payment_status': row.payment_status || 'NULL',
      'status': row.status || 'NULL',
      '건수': row.count,
      '총 금액': Number(row.total_amount || 0).toLocaleString() + '원',
      '총 환불액': Number(row.total_refund || 0).toLocaleString() + '원'
    })));

    // 2. API가 조회하는 데이터 (payment_status='paid'만)
    console.log('\n\n📊 2. /api/vendor/bookings API 조회 데이터 (payment_status=\'paid\')');
    console.log('-'.repeat(80));

    const apiBookings = await connection.execute(`
      SELECT
        id,
        booking_number,
        vendor_id,
        status,
        payment_status,
        total_krw as total_amount,
        refund_amount_krw,
        refunded_at,
        created_at
      FROM rentcar_bookings
      WHERE payment_status = 'paid'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n✅ API가 조회하는 예약 건수: ${apiBookings.rows.length}건`);
    if (apiBookings.rows.length > 0) {
      console.table(apiBookings.rows.map(row => ({
        'ID': row.id,
        '예약번호': row.booking_number || 'N/A',
        'status': row.status,
        'payment_status': row.payment_status,
        '금액': Number(row.total_amount || 0).toLocaleString() + '원',
        '환불액': row.refund_amount_krw ? Number(row.refund_amount_krw).toLocaleString() + '원' : '-'
      })));
    }

    // 3. 환불된 예약 (payment_status='refunded')
    console.log('\n\n📊 3. 환불된 예약 (payment_status=\'refunded\') - API에서 누락됨');
    console.log('-'.repeat(80));

    const refundedBookings = await connection.execute(`
      SELECT
        id,
        booking_number,
        vendor_id,
        status,
        payment_status,
        total_krw as total_amount,
        refund_amount_krw,
        refunded_at,
        created_at
      FROM rentcar_bookings
      WHERE payment_status = 'refunded'
      ORDER BY refunded_at DESC
      LIMIT 10
    `);

    console.log(`\n❌ 환불 완료 예약 건수: ${refundedBookings.rows.length}건 (API에서 조회되지 않음)`);
    if (refundedBookings.rows.length > 0) {
      console.table(refundedBookings.rows.map(row => ({
        'ID': row.id,
        '예약번호': row.booking_number || 'N/A',
        'status': row.status,
        'payment_status': row.payment_status,
        '원래금액': Number(row.total_amount || 0).toLocaleString() + '원',
        '환불액': Number(row.refund_amount_krw || 0).toLocaleString() + '원',
        '환불일': row.refunded_at ? new Date(row.refunded_at).toLocaleString('ko-KR') : '-'
      })));
    }

    // 4. /api/vendor/revenue 조회 쿼리 분석
    console.log('\n\n📊 4. /api/vendor/revenue API 쿼리 분석');
    console.log('-'.repeat(80));

    const revenueQuery = await connection.execute(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as booking_count,
        SUM(total_krw) as revenue
      FROM rentcar_bookings
      WHERE status IN ('confirmed', 'paid', 'completed')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    console.log('\n✅ 최근 7일 매출 데이터 (status IN (\'confirmed\', \'paid\', \'completed\'))');
    if (revenueQuery.rows.length > 0) {
      console.table(revenueQuery.rows.map(row => ({
        '날짜': row.date,
        '예약건수': row.booking_count,
        '매출': Number(row.revenue || 0).toLocaleString() + '원'
      })));
    } else {
      console.log('⚠️ 최근 7일 매출 데이터 없음');
    }

    // 5. 프론트엔드 통계 계산 시뮬레이션
    console.log('\n\n📊 5. 프론트엔드 통계 계산 시뮬레이션');
    console.log('-'.repeat(80));

    // payment_status='paid'인 예약만 가져옴 (API가 조회하는 데이터)
    const frontendBookings = await connection.execute(`
      SELECT
        status,
        payment_status,
        total_krw as total_amount
      FROM rentcar_bookings
      WHERE payment_status = 'paid'
    `);

    const totalBookings = frontendBookings.rows.length;
    const completedRevenue = frontendBookings.rows
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

    console.log(`\n현재 프론트엔드 통계:`);
    console.log(`  - 총 예약 건수: ${totalBookings}건 (payment_status='paid'만 카운트)`);
    console.log(`  - 이번 달 매출: ${completedRevenue.toLocaleString()}원 (status='completed'만 합산)`);

    // 실제로 있어야 할 데이터
    const allBookingsCount = await connection.execute(`
      SELECT COUNT(*) as count FROM rentcar_bookings
      WHERE status != 'deleted'
    `);

    const allRevenue = await connection.execute(`
      SELECT
        SUM(CASE WHEN status = 'completed' AND payment_status = 'paid' THEN total_krw ELSE 0 END) as paid_revenue,
        SUM(CASE WHEN payment_status = 'refunded' THEN refund_amount_krw ELSE 0 END) as refunded_amount
      FROM rentcar_bookings
    `);

    console.log(`\n실제 전체 데이터:`);
    console.log(`  - 전체 예약 건수: ${allBookingsCount.rows[0].count}건 (deleted 제외)`);
    console.log(`  - 완료된 결제 매출: ${Number(allRevenue.rows[0].paid_revenue || 0).toLocaleString()}원`);
    console.log(`  - 환불된 금액: ${Number(allRevenue.rows[0].refunded_amount || 0).toLocaleString()}원`);
    console.log(`  - 순 매출: ${(Number(allRevenue.rows[0].paid_revenue || 0) - Number(allRevenue.rows[0].refunded_amount || 0)).toLocaleString()}원`);

    // 6. 문제점 분석
    console.log('\n\n⚠️ 6. 발견된 문제점');
    console.log('='.repeat(80));

    const issues = [];

    // 문제 1: API가 payment_status='paid'만 조회
    if (refundedBookings.rows.length > 0) {
      issues.push({
        '문제': '환불된 예약 누락',
        '위치': 'api/vendor/bookings.js:95',
        '설명': 'WHERE payment_status = \'paid\' 조건으로 환불된 예약이 목록에서 제외됨',
        '영향': `${refundedBookings.rows.length}건의 환불 예약이 대시보드에 표시되지 않음`
      });
    }

    // 문제 2: 매출 계산에서 환불 미차감
    const totalRefunded = Number(allRevenue.rows[0].refunded_amount || 0);
    if (totalRefunded > 0) {
      issues.push({
        '문제': '매출에서 환불 미차감',
        '위치': 'components/VendorDashboardPageEnhanced.tsx:1213',
        '설명': 'status=\'completed\'만 합산하고 환불 금액을 차감하지 않음',
        '영향': `${totalRefunded.toLocaleString()}원이 과다 계상됨`
      });
    }

    // 문제 3: revenue API도 환불 미반영
    issues.push({
      '문제': '매출 차트에 환불 미반영',
      '위치': 'api/vendor/revenue.js:60',
      '설명': 'status IN (\'confirmed\', \'paid\', \'completed\')만 집계, 환불 차감 없음',
      '영향': '매출 차트가 실제보다 높게 표시됨'
    });

    if (issues.length > 0) {
      console.log('\n❌ 총 ' + issues.length + '개의 문제 발견:\n');
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue['문제']}`);
        console.log(`   📁 파일: ${issue['위치']}`);
        console.log(`   📝 설명: ${issue['설명']}`);
        console.log(`   💥 영향: ${issue['영향']}\n`);
      });
    } else {
      console.log('\n✅ 문제점 없음');
    }

    // 7. 수정 권장사항
    console.log('\n💡 7. 수정 권장사항');
    console.log('='.repeat(80));

    console.log(`
1. /api/vendor/bookings.js (Line 95)
   ❌ 현재: WHERE payment_status = 'paid'
   ✅ 수정: WHERE payment_status IN ('paid', 'refunded') 또는 WHERE 조건 제거

2. /api/vendor/revenue.js (Line 57-62)
   ❌ 현재: SUM(total_amount)만 계산
   ✅ 수정:
      SELECT
        DATE(created_at) as date,
        SUM(CASE WHEN payment_status = 'paid' THEN total_krw ELSE 0 END) -
        SUM(CASE WHEN payment_status = 'refunded' THEN COALESCE(refund_amount_krw, 0) ELSE 0 END) as revenue

3. VendorDashboardPageEnhanced.tsx (Line 1211-1214)
   ❌ 현재:
      bookings.filter(b => b.status === 'completed')
              .reduce((sum, b) => sum + b.total_amount, 0)

   ✅ 수정:
      bookings.filter(b => b.status === 'completed' && b.payment_status === 'paid')
              .reduce((sum, b) => sum + b.total_amount, 0) -
      bookings.filter(b => b.payment_status === 'refunded')
              .reduce((sum, b) => sum + (b.refund_amount_krw || 0), 0)

4. 예약 목록에 환불 정보 표시 강화 (Line 1647-1677)
   ✅ 이미 구현됨:
      - payment_status='refunded'일 때 "환불완료" 뱃지 표시
      - 환불 금액 표시는 개선 필요 (현재는 원래 금액만 표시)
    `);

    console.log('\n' + '='.repeat(80));
    console.log('✅ 검증 완료');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
checkVendorDashboardPayments()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('실행 실패:', error);
    process.exit(1);
  });
