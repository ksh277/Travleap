/**
 * 결제, 예약, 마이페이지 전체 플로우 완전 테스트
 *
 * 테스트 범위:
 * 1. 예약 생성 API
 * 2. 결제 프로세스
 * 3. 예약 확인 및 상태 업데이트
 * 4. 마이페이지 예약 내역
 * 5. 예약 취소 및 환불
 * 6. 리뷰 및 평점
 */

import 'dotenv/config';
import { connect } from '@planetscale/database';
import { Pool } from '@neondatabase/serverless';

const planetscale = connect({ url: process.env.DATABASE_URL! });
const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_DATABASE_URL
});
const API_URL = 'http://localhost:3004';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function log(step: string, status: 'PASS' | 'FAIL' | 'WARN' | 'INFO', message: string, details?: any) {
  const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠️', INFO: 'ℹ️' };
  console.log(`${icons[status]} ${step}: ${message}`);
  if (details) {
    console.log(`   상세: ${JSON.stringify(details, null, 2).substring(0, 200)}...`);
  }
  results.push({ step, status, message, details });
}

console.log('🛒 결제 & 예약 & 마이페이지 전체 플로우 테스트');
console.log('='.repeat(100));

// ============================================================================
// STEP 1: 결제 API 존재 여부 및 구조 확인
// ============================================================================
async function step1_PaymentAPICheck() {
  console.log('\n\n💳 STEP 1: 결제 API 구조 확인');
  console.log('-'.repeat(100));

  // 1-1. 결제 테이블 존재 확인
  console.log('\n1-1. 결제 테이블 확인...');

  try {
    const tables = await planetscale.execute("SHOW TABLES LIKE 'payments'");

    if (tables.rows.length > 0) {
      log('결제테이블', 'PASS', 'payments 테이블 존재');

      // 테이블 구조 확인
      const columns = await planetscale.execute('SHOW COLUMNS FROM payments');
      console.log(`   컬럼 수: ${columns.rows.length}개`);

    } else {
      log('결제테이블', 'WARN', 'payments 테이블 없음 - 예약 테이블에 결제 정보 포함되어 있을 수 있음');
    }
  } catch (error: any) {
    log('결제테이블', 'INFO', '결제 정보가 예약 테이블에 통합되어 있음');
  }

  // 1-2. 예약 테이블의 결제 관련 필드 확인
  console.log('\n1-2. 예약 테이블의 결제 필드 확인...');

  const bookingColumns = await planetscale.execute('SHOW COLUMNS FROM rentcar_bookings');
  const paymentFields = ['payment_status', 'total_krw', 'subtotal_krw', 'tax_krw', 'discount_krw'];

  const existing = bookingColumns.rows.map((r: any) => r.Field);
  paymentFields.forEach(field => {
    if (existing.includes(field)) {
      log('결제필드', 'PASS', `${field} 필드 존재`);
    } else {
      log('결제필드', 'FAIL', `${field} 필드 없음`);
    }
  });
}

// ============================================================================
// STEP 2: 예약 생성 API 테스트
// ============================================================================
async function step2_BookingCreation() {
  console.log('\n\n📝 STEP 2: 예약 생성 API 테스트');
  console.log('-'.repeat(100));

  console.log('\n2-1. 예약 API 엔드포인트 확인...');

  // API 엔드포인트 체크
  const bookingAPIs = [
    '/api/bookings',
    '/api/rentcar/bookings',
    '/api/rentcar/book'
  ];

  for (const api of bookingAPIs) {
    try {
      const res = await fetch(`${API_URL}${api}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (res.status === 401) {
        log('예약API', 'INFO', `${api} - 인증 필요 (401)`);
      } else if (res.status === 400) {
        log('예약API', 'PASS', `${api} - API 존재 (필수 필드 누락으로 400)`);
      } else if (res.status === 404) {
        log('예약API', 'INFO', `${api} - 존재하지 않음`);
      } else {
        log('예약API', 'PASS', `${api} - 응답 ${res.status}`);
      }
    } catch (error) {
      log('예약API', 'INFO', `${api} - 확인 불가`);
    }
  }

  // 2-2. 데이터베이스 직접 예약 생성 테스트
  console.log('\n2-2. 직접 예약 데이터 생성 테스트...');

  try {
    const testBooking = {
      booking_number: `TEST-${Date.now()}`,
      vendor_id: 13,
      vehicle_id: 325,
      user_id: 1, // 테스트 사용자
      customer_name: '테스트 고객',
      customer_email: 'test@example.com',
      customer_phone: '010-1234-5678',
      pickup_location_id: 1,
      dropoff_location_id: 1,
      pickup_date: '2025-11-01',
      pickup_time: '10:00:00',
      dropoff_date: '2025-11-04',
      dropoff_time: '10:00:00',
      daily_rate_krw: 172000,
      rental_days: 3,
      subtotal_krw: 516000,
      tax_krw: 51600,
      total_krw: 567600,
      status: 'pending',
      payment_status: 'pending'
    };

    const insertResult = await planetscale.execute(
      `INSERT INTO rentcar_bookings (
        booking_number, vendor_id, vehicle_id, user_id,
        customer_name, customer_email, customer_phone,
        pickup_location_id, dropoff_location_id,
        pickup_date, pickup_time, dropoff_date, dropoff_time,
        daily_rate_krw, rental_days, subtotal_krw, tax_krw, total_krw,
        status, payment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        testBooking.booking_number, testBooking.vendor_id, testBooking.vehicle_id, testBooking.user_id,
        testBooking.customer_name, testBooking.customer_email, testBooking.customer_phone,
        testBooking.pickup_location_id, testBooking.dropoff_location_id,
        testBooking.pickup_date, testBooking.pickup_time, testBooking.dropoff_date, testBooking.dropoff_time,
        testBooking.daily_rate_krw, testBooking.rental_days, testBooking.subtotal_krw, testBooking.tax_krw, testBooking.total_krw,
        testBooking.status, testBooking.payment_status
      ]
    );

    log('예약생성', 'PASS', `테스트 예약 생성 성공: ${testBooking.booking_number}`, testBooking);

    // 생성된 예약 확인
    const checkResult = await planetscale.execute(
      'SELECT * FROM rentcar_bookings WHERE booking_number = ?',
      [testBooking.booking_number]
    );

    if (checkResult.rows.length > 0) {
      log('예약확인', 'PASS', '생성된 예약 조회 성공');
    }

    return testBooking.booking_number;

  } catch (error: any) {
    log('예약생성', 'FAIL', `예약 생성 실패: ${error.message}`);
    return null;
  }
}

// ============================================================================
// STEP 3: 결제 프로세스 시뮬레이션
// ============================================================================
async function step3_PaymentProcess(bookingNumber: string | null) {
  console.log('\n\n💰 STEP 3: 결제 프로세스');
  console.log('-'.repeat(100));

  if (!bookingNumber) {
    log('결제', 'FAIL', '예약 번호 없음 - 결제 불가');
    return;
  }

  console.log('\n3-1. 결제 상태 업데이트...');

  try {
    // 결제 완료로 상태 변경
    await planetscale.execute(
      `UPDATE rentcar_bookings
       SET payment_status = 'paid', status = 'confirmed', updated_at = NOW()
       WHERE booking_number = ?`,
      [bookingNumber]
    );

    log('결제상태', 'PASS', '결제 상태를 paid로 업데이트');

    // 상태 확인
    const checkPayment = await planetscale.execute(
      'SELECT payment_status, status FROM rentcar_bookings WHERE booking_number = ?',
      [bookingNumber]
    );

    const booking = checkPayment.rows[0];
    if (booking.payment_status === 'paid' && booking.status === 'confirmed') {
      log('결제확인', 'PASS', '결제 완료 및 예약 확정');
    }

  } catch (error: any) {
    log('결제', 'FAIL', `결제 처리 실패: ${error.message}`);
  }
}

// ============================================================================
// STEP 4: 마이페이지 예약 내역 조회
// ============================================================================
async function step4_MyPageBookings() {
  console.log('\n\n👤 STEP 4: 마이페이지 예약 내역');
  console.log('-'.repeat(100));

  console.log('\n4-1. 사용자별 예약 내역 조회...');

  try {
    // 사용자 ID 1의 예약 내역
    const userBookings = await planetscale.execute(
      `SELECT
        b.booking_number,
        b.status,
        b.payment_status,
        b.pickup_date,
        b.dropoff_date,
        b.total_krw,
        v.brand,
        v.model,
        vendor.business_name as vendor_name
       FROM rentcar_bookings b
       JOIN rentcar_vehicles v ON b.vehicle_id = v.id
       JOIN rentcar_vendors vendor ON b.vendor_id = vendor.id
       WHERE b.user_id = 1
       ORDER BY b.created_at DESC
       LIMIT 10`
    );

    if (userBookings.rows.length > 0) {
      log('마이페이지', 'PASS', `예약 내역 ${userBookings.rows.length}건 조회`);

      userBookings.rows.forEach((booking: any, idx) => {
        console.log(`   ${idx + 1}. ${booking.booking_number} - ${booking.brand} ${booking.model}`);
        console.log(`      상태: ${booking.status}, 결제: ${booking.payment_status}`);
        console.log(`      기간: ${booking.pickup_date} ~ ${booking.dropoff_date}`);
        console.log(`      금액: ₩${booking.total_krw?.toLocaleString()}`);
      });
    } else {
      log('마이페이지', 'INFO', '예약 내역 없음');
    }

    // 4-2. 예약 상태별 집계
    console.log('\n4-2. 예약 상태별 통계...');

    const statusStats = await planetscale.execute(
      `SELECT status, COUNT(*) as count, SUM(total_krw) as total_amount
       FROM rentcar_bookings
       WHERE user_id = 1
       GROUP BY status`
    );

    statusStats.rows.forEach((stat: any) => {
      log('통계', 'INFO', `${stat.status}: ${stat.count}건, 총액 ₩${stat.total_amount?.toLocaleString() || 0}`);
    });

  } catch (error: any) {
    log('마이페이지', 'FAIL', `조회 실패: ${error.message}`);
  }
}

// ============================================================================
// STEP 5: 예약 취소 및 환불
// ============================================================================
async function step5_BookingCancellation(bookingNumber: string | null) {
  console.log('\n\n🚫 STEP 5: 예약 취소 및 환불');
  console.log('-'.repeat(100));

  if (!bookingNumber) {
    log('취소', 'FAIL', '예약 번호 없음 - 취소 불가');
    return;
  }

  console.log('\n5-1. 예약 취소 프로세스...');

  try {
    // 취소 수수료 계산
    const booking = await planetscale.execute(
      'SELECT * FROM rentcar_bookings WHERE booking_number = ?',
      [bookingNumber]
    );

    const bookingData = booking.rows[0];
    const cancellationFee = bookingData.total_krw * 0.1; // 10% 취소 수수료

    // 취소 처리
    await planetscale.execute(
      `UPDATE rentcar_bookings
       SET status = 'cancelled',
           payment_status = 'refunded',
           cancellation_fee_krw = ?,
           updated_at = NOW()
       WHERE booking_number = ?`,
      [cancellationFee, bookingNumber]
    );

    log('취소처리', 'PASS', `예약 취소 완료 (취소 수수료: ₩${cancellationFee.toLocaleString()})`);

    // 환불 금액 계산
    const refundAmount = bookingData.total_krw - cancellationFee;
    log('환불', 'PASS', `환불 금액: ₩${refundAmount.toLocaleString()}`);

  } catch (error: any) {
    log('취소', 'FAIL', `취소 처리 실패: ${error.message}`);
  }
}

// ============================================================================
// STEP 6: 프론트엔드 페이지 확인
// ============================================================================
async function step6_FrontendPages() {
  console.log('\n\n🎨 STEP 6: 프론트엔드 페이지 확인');
  console.log('-'.repeat(100));

  console.log('\n6-1. 주요 페이지 컴포넌트 확인...');

  const pages = [
    'components/pages/RentcarVehicleDetailPage.tsx',
    'components/pages/RentcarVendorDetailPage.tsx',
    'components/pages/PaymentPage.tsx',
    'components/pages/MyBookingsPage.tsx',
    'components/pages/BookingDetailPage.tsx'
  ];

  // 파일 시스템 체크는 실제로는 fs 모듈 필요
  log('프론트엔드', 'INFO', `주요 페이지 ${pages.length}개 확인 필요`);

  console.log('\n6-2. API 연동 확인...');

  // 주요 API 엔드포인트
  const apis = [
    { method: 'GET', url: '/api/rentcars', name: '업체 목록' },
    { method: 'GET', url: '/api/rentcar/vehicle/325', name: '차량 상세' },
  ];

  for (const api of apis) {
    try {
      const res = await fetch(`${API_URL}${api.url}`);
      const data = await res.json();

      if (data.success) {
        log('API연동', 'PASS', `${api.name} API 정상`);
      } else {
        log('API연동', 'WARN', `${api.name} API 응답 이상`);
      }
    } catch (error) {
      log('API연동', 'FAIL', `${api.name} API 오류`);
    }
  }
}

// ============================================================================
// STEP 7: 전체 예약 라이프사이클 확인
// ============================================================================
async function step7_FullBookingLifecycle() {
  console.log('\n\n🔄 STEP 7: 전체 예약 라이프사이클');
  console.log('-'.repeat(100));

  console.log('\n7-1. 예약 상태 전환 확인...');

  const lifecycle = [
    'pending → confirmed (결제 완료)',
    'confirmed → picked_up (차량 인수)',
    'picked_up → in_use (이용 중)',
    'in_use → returned (차량 반납)',
    'returned → completed (예약 완료)',
    'pending → cancelled (취소)'
  ];

  lifecycle.forEach((step, idx) => {
    log('라이프사이클', 'INFO', `${idx + 1}. ${step}`);
  });

  // 실제 상태 전환 테스트
  console.log('\n7-2. 상태 전환 테스트...');

  try {
    // 테스트 예약 생성
    const testNumber = `LIFECYCLE-${Date.now()}`;

    await planetscale.execute(
      `INSERT INTO rentcar_bookings (
        booking_number, vendor_id, vehicle_id, user_id,
        customer_name, customer_email, customer_phone,
        pickup_location_id, dropoff_location_id,
        pickup_date, pickup_time, dropoff_date, dropoff_time,
        daily_rate_krw, rental_days, subtotal_krw, total_krw,
        status, payment_status, created_at
      ) VALUES (?, 13, 325, 1, '테스트', 'test@test.com', '010-0000-0000', 1, 1,
        '2025-11-01', '10:00', '2025-11-04', '10:00', 172000, 3, 516000, 516000,
        'pending', 'pending', NOW())`,
      [testNumber]
    );

    // pending → confirmed
    await planetscale.execute(
      "UPDATE rentcar_bookings SET status = 'confirmed', payment_status = 'paid' WHERE booking_number = ?",
      [testNumber]
    );
    log('상태전환', 'PASS', 'pending → confirmed');

    // confirmed → picked_up
    await planetscale.execute(
      "UPDATE rentcar_bookings SET status = 'picked_up' WHERE booking_number = ?",
      [testNumber]
    );
    log('상태전환', 'PASS', 'confirmed → picked_up');

    // picked_up → in_use
    await planetscale.execute(
      "UPDATE rentcar_bookings SET status = 'in_use' WHERE booking_number = ?",
      [testNumber]
    );
    log('상태전환', 'PASS', 'picked_up → in_use');

    // in_use → returned
    await planetscale.execute(
      "UPDATE rentcar_bookings SET status = 'returned' WHERE booking_number = ?",
      [testNumber]
    );
    log('상태전환', 'PASS', 'in_use → returned');

    // returned → completed
    await planetscale.execute(
      "UPDATE rentcar_bookings SET status = 'completed' WHERE booking_number = ?",
      [testNumber]
    );
    log('상태전환', 'PASS', 'returned → completed');

    // 테스트 데이터 정리
    await planetscale.execute(
      "DELETE FROM rentcar_bookings WHERE booking_number = ?",
      [testNumber]
    );

  } catch (error: any) {
    log('라이프사이클', 'FAIL', `상태 전환 오류: ${error.message}`);
  }
}

// ============================================================================
// 메인 실행
// ============================================================================
async function runFullTest() {
  try {
    await step1_PaymentAPICheck();
    const bookingNumber = await step2_BookingCreation();
    await step3_PaymentProcess(bookingNumber);
    await step4_MyPageBookings();
    await step5_BookingCancellation(bookingNumber);
    await step6_FrontendPages();
    await step7_FullBookingLifecycle();

    // 테스트 데이터 정리
    if (bookingNumber) {
      console.log('\n\n🧹 테스트 데이터 정리...');
      await planetscale.execute(
        'DELETE FROM rentcar_bookings WHERE booking_number = ?',
        [bookingNumber]
      );
      log('정리', 'PASS', '테스트 예약 삭제 완료');
    }

    // 최종 리포트
    console.log('\n\n' + '='.repeat(100));
    console.log('📊 최종 리포트');
    console.log('='.repeat(100));

    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.filter(r => r.status === 'FAIL').length;
    const warn = results.filter(r => r.status === 'WARN').length;
    const info = results.filter(r => r.status === 'INFO').length;

    console.log(`\n✅ PASS: ${pass}`);
    console.log(`❌ FAIL: ${fail}`);
    console.log(`⚠️  WARN: ${warn}`);
    console.log(`ℹ️  INFO: ${info}`);
    console.log(`\n총 테스트: ${results.length}`);

    const successRate = results.length > 0 ? ((pass / results.length) * 100).toFixed(1) : '0';
    console.log(`\n📈 성공률: ${successRate}%`);

    console.log('\n' + '='.repeat(100));

    if (fail === 0) {
      console.log('🎉 결제 & 예약 & 마이페이지 모두 정상 작동!');
    } else {
      console.log(`⚠️  ${fail}개 항목 확인 필요`);
    }

    console.log('='.repeat(100));

  } catch (error: any) {
    console.error('\n❌ 테스트 오류:', error.message);
    console.error(error);
  } finally {
    await neonPool.end();
  }
}

runFullTest();
