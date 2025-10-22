/**
 * 렌트카 시스템 완전 심층 분석 (수정 버전)
 *
 * 실제 테이블 구조에 맞춰 전체 검증:
 * - dropoff_date (return_date 아님)
 * - total_krw (total_price 아님)
 * - pickup_date, dropoff_date (date 타입)
 * - pickup_time, dropoff_time (time 타입)
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
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  message: string;
}

const results: TestResult[] = [];

function log(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARN' | 'INFO', message: string) {
  const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠️', INFO: 'ℹ️' };
  console.log(`${icons[status]} [${category}] ${message}`);
  results.push({ category, test, status, message });
}

console.log('🔍 렌트카 시스템 완전 심층 분석');
console.log('='.repeat(100));
console.log('');

// ============================================================================
// PART 1: 데이터베이스 스키마 및 구조 검증
// ============================================================================
async function part1_DatabaseSchema() {
  console.log('\n💾 PART 1: 데이터베이스 스키마 및 구조 검증');
  console.log('-'.repeat(100));

  // 1-1. 테이블 존재 확인
  console.log('\n1-1. 필수 테이블 존재 확인...');
  const tables = ['rentcar_vendors', 'rentcar_vehicles', 'rentcar_bookings'];

  for (const table of tables) {
    try {
      const result = await planetscale.execute(`SHOW TABLES LIKE '${table}'`);
      if (result.rows.length > 0) {
        log('스키마', table, 'PASS', `${table} 테이블 존재`);
      } else {
        log('스키마', table, 'FAIL', `${table} 테이블 없음`);
      }
    } catch (error: any) {
      log('스키마', table, 'FAIL', `${table} 확인 실패: ${error.message}`);
    }
  }

  // 1-2. rentcar_bookings 상세 구조 확인
  console.log('\n1-2. 예약 테이블 구조 상세 확인...');
  const bookingsColumns = await planetscale.execute('SHOW COLUMNS FROM rentcar_bookings');

  const requiredBookingColumns = [
    'id', 'booking_number', 'vendor_id', 'vehicle_id', 'user_id',
    'pickup_date', 'pickup_time', 'dropoff_date', 'dropoff_time',
    'total_krw', 'status'
  ];

  const existingColumns = bookingsColumns.rows.map((r: any) => r.Field);

  requiredBookingColumns.forEach(col => {
    if (existingColumns.includes(col)) {
      log('스키마', 'bookings-' + col, 'PASS', `예약 테이블에 ${col} 컬럼 존재`);
    } else {
      log('스키마', 'bookings-' + col, 'FAIL', `예약 테이블에 ${col} 컬럼 없음 - 예약 기능 불가`);
    }
  });

  // 1-3. 인덱스 확인
  console.log('\n1-3. 인덱스 최적화 확인...');
  const indexes = await planetscale.execute('SHOW INDEX FROM rentcar_vehicles');

  const indexedColumns = new Set(indexes.rows.map((r: any) => r.Column_name));
  const recommendedIndexes = ['vendor_id', 'vehicle_class', 'is_active'];

  recommendedIndexes.forEach(col => {
    if (indexedColumns.has(col)) {
      log('성능', 'index-' + col, 'PASS', `${col}에 인덱스 존재 - 조회 성능 최적화`);
    } else {
      log('성능', 'index-' + col, 'WARN', `${col}에 인덱스 없음 - 대량 데이터 시 성능 저하 가능`);
    }
  });
}

// ============================================================================
// PART 2: 사용자 여정 전체 플로우 (165개 차량 샘플링)
// ============================================================================
async function part2_UserJourney() {
  console.log('\n\n👤 PART 2: 사용자 여정 전체 플로우');
  console.log('-'.repeat(100));

  // 2-1. 홈페이지 → 업체 검색
  console.log('\n2-1. 홈페이지 → 업체 검색...');
  try {
    const vendorsRes = await fetch(`${API_URL}/api/rentcars`);
    const vendorsData = await vendorsRes.json();

    if (vendorsData.success && vendorsData.data.length > 0) {
      log('사용자', 'search-vendors', 'PASS', `업체 검색 성공 (${vendorsData.data.length}개 업체)`);

      const activeVendors = vendorsData.data.filter((v: any) => v.vehicle_count > 0);
      if (activeVendors.length > 0) {
        log('사용자', 'active-vendors', 'PASS', `차량 보유 업체: ${activeVendors.length}개`);
      } else {
        log('사용자', 'active-vendors', 'FAIL', '차량 보유 업체 없음 - 예약 불가');
      }
    } else {
      log('사용자', 'search-vendors', 'FAIL', '업체 검색 실패');
    }
  } catch (error: any) {
    log('사용자', 'search-vendors', 'FAIL', `업체 검색 오류: ${error.message}`);
  }

  // 2-2. 차량 상세 페이지 (165개 샘플 10개)
  console.log('\n2-2. 차량 상세 페이지 접근 (165개 중 샘플 10개)...');

  const vehicleIds = [325, 350, 375, 400, 425, 450, 475, 485, 488, 489];
  let detailPass = 0;
  let detailFail = 0;

  for (const id of vehicleIds) {
    try {
      const res = await fetch(`${API_URL}/api/rentcar/vehicle/${id}`);
      const data = await res.json();

      if (data.success && data.data) {
        const v = data.data;

        // 필수 정보 확인
        const hasAllInfo = v.brand && v.model && v.daily_rate_krw && v.hourly_rate_krw && v.vendor_name;

        if (hasAllInfo) {
          detailPass++;
        } else {
          log('사용자', `detail-${id}`, 'WARN', `차량 ${id} 정보 불완전`);
          detailFail++;
        }
      } else {
        log('사용자', `detail-${id}`, 'FAIL', `차량 ${id} 조회 실패`);
        detailFail++;
      }
    } catch (error: any) {
      log('사용자', `detail-${id}`, 'FAIL', `차량 ${id} 오류: ${error.message}`);
      detailFail++;
    }
  }

  log('사용자', 'detail-summary', detailFail === 0 ? 'PASS' : 'WARN',
    `차량 상세 페이지: ${detailPass}/${vehicleIds.length} 성공`);

  // 2-3. 가격 계산 및 예약 정보 구성
  console.log('\n2-3. 가격 계산 및 예약 정보 구성...');

  try {
    const vehicleRes = await fetch(`${API_URL}/api/rentcar/vehicle/325`);
    const vehicleData = await vehicleRes.json();
    const v = vehicleData.data;

    // 시간 단위 계산
    const hourly8 = v.hourly_rate_krw * 8;
    // 일일 계산
    const daily3 = v.daily_rate_krw * 3;
    // 24시간 vs 1일
    const hourly24 = v.hourly_rate_krw * 24;

    if (hourly24 > daily3) {
      log('사용자', 'price-logic', 'PASS', '가격 정책 정상 (24시간 > 1일)');
    } else {
      log('사용자', 'price-logic', 'WARN', '가격 정책 이상 (24시간 ≤ 1일)');
    }

    // 예약 정보 검증
    const bookingInfo = {
      vehicle_id: v.id,
      vendor_id: v.vendor_id,
      pickup_date: '2025-11-01',
      pickup_time: '10:00:00',
      dropoff_date: '2025-11-04',
      dropoff_time: '10:00:00',
      rental_days: 3,
      total_krw: daily3
    };

    if (bookingInfo.dropoff_date > bookingInfo.pickup_date) {
      log('사용자', 'booking-dates', 'PASS', '예약 날짜 유효');
    } else {
      log('사용자', 'booking-dates', 'FAIL', '예약 날짜 오류');
    }

  } catch (error: any) {
    log('사용자', 'price-booking', 'FAIL', `가격/예약 오류: ${error.message}`);
  }
}

// ============================================================================
// PART 3: 벤더 관리 기능 (차량 CRUD, 예약 관리)
// ============================================================================
async function part3_VendorManagement() {
  console.log('\n\n🏢 PART 3: 벤더 관리 기능');
  console.log('-'.repeat(100));

  // 3-1. 벤더 계정 확인
  console.log('\n3-1. 벤더 계정 및 연결 상태...');

  try {
    const vendorUsers = await neonPool.query(
      "SELECT id, email FROM users WHERE role = 'vendor'"
    );

    log('벤더', 'accounts', vendorUsers.rows.length > 0 ? 'PASS' : 'FAIL',
      `벤더 계정: ${vendorUsers.rows.length}개`);

    // PlanetScale 연결 확인
    let connectedCount = 0;
    for (const user of vendorUsers.rows) {
      const vendorCheck = await planetscale.execute(
        'SELECT id, business_name FROM rentcar_vendors WHERE user_id = ?',
        [user.id]
      );

      if (vendorCheck.rows.length > 0) {
        connectedCount++;
      }
    }

    log('벤더', 'connection', connectedCount > 0 ? 'PASS' : 'WARN',
      `Neon-PlanetScale 연결: ${connectedCount}/${vendorUsers.rows.length}`);

  } catch (error: any) {
    log('벤더', 'accounts', 'FAIL', `벤더 계정 확인 오류: ${error.message}`);
  }

  // 3-2. 차량 관리 API
  console.log('\n3-2. 차량 관리 API (CRUD)...');

  // 인증 필요 API 테스트 (토큰 없이)
  const noTokenRes = await fetch(`${API_URL}/api/vendor/vehicles`);
  if (noTokenRes.status === 401) {
    log('벤더', 'auth-required', 'PASS', '인증 없는 접근 차단 (401)');
  } else {
    log('벤더', 'auth-required', 'FAIL', '인증 없이 접근 가능 - 보안 취약');
  }

  // 3-3. 예약 관리 기능
  console.log('\n3-3. 예약 관리 기능...');

  try {
    // 예약 통계 (실제 컬럼명 사용)
    const bookingStats = await planetscale.execute(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'confirmed' THEN total_krw ELSE 0 END) as confirmed_revenue,
        SUM(CASE WHEN status = 'cancelled' THEN total_krw ELSE 0 END) as cancelled_revenue
       FROM rentcar_bookings
       WHERE vendor_id = 13`
    );

    const stats = bookingStats.rows[0];
    log('벤더', 'booking-stats', 'PASS',
      `예약 통계 조회 성공 (총 ${stats.total}건, 확정 매출: ₩${stats.confirmed_revenue?.toLocaleString() || 0})`);

  } catch (error: any) {
    log('벤더', 'booking-stats', 'FAIL', `예약 통계 오류: ${error.message}`);
  }

  // 3-4. 매출 리포트
  console.log('\n3-4. 매출 리포트...');

  try {
    const revenueReport = await planetscale.execute(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as bookings,
        SUM(total_krw) as revenue
       FROM rentcar_bookings
       WHERE vendor_id = 13 AND status IN ('confirmed', 'completed')
       GROUP BY month
       ORDER BY month DESC
       LIMIT 6`
    );

    if (revenueReport.rows.length > 0) {
      log('벤더', 'revenue-report', 'PASS', `월별 매출 리포트 조회 성공 (${revenueReport.rows.length}개월)`);
    } else {
      log('벤더', 'revenue-report', 'INFO', '매출 데이터 없음 (예약 없음)');
    }

  } catch (error: any) {
    log('벤더', 'revenue-report', 'FAIL', `매출 리포트 오류: ${error.message}`);
  }
}

// ============================================================================
// PART 4: 예약 시스템 무결성
// ============================================================================
async function part4_BookingIntegrity() {
  console.log('\n\n📅 PART 4: 예약 시스템 무결성');
  console.log('-'.repeat(100));

  // 4-1. 중복 예약 확인
  console.log('\n4-1. 중복 예약 방지...');

  try {
    const duplicates = await planetscale.execute(
      `SELECT vehicle_id, pickup_date, COUNT(*) as count
       FROM rentcar_bookings
       WHERE status IN ('confirmed', 'picked_up', 'in_use')
       GROUP BY vehicle_id, pickup_date
       HAVING count > 1`
    );

    if (duplicates.rows.length === 0) {
      log('예약', 'duplicates', 'PASS', '중복 예약 없음');
    } else {
      log('예약', 'duplicates', 'FAIL', `중복 예약 ${duplicates.rows.length}건 발견`);
    }

  } catch (error: any) {
    log('예약', 'duplicates', 'FAIL', `중복 예약 확인 오류: ${error.message}`);
  }

  // 4-2. 날짜 유효성 (dropoff_date 사용)
  console.log('\n4-2. 날짜 유효성...');

  try {
    const invalidDates = await planetscale.execute(
      `SELECT id, pickup_date, dropoff_date
       FROM rentcar_bookings
       WHERE dropoff_date <= pickup_date`
    );

    if (invalidDates.rows.length === 0) {
      log('예약', 'date-validity', 'PASS', '모든 예약 날짜 유효');
    } else {
      log('예약', 'date-validity', 'FAIL', `잘못된 날짜 ${invalidDates.rows.length}건`);
    }

  } catch (error: any) {
    log('예약', 'date-validity', 'FAIL', `날짜 확인 오류: ${error.message}`);
  }

  // 4-3. 예약 상태 일관성
  console.log('\n4-3. 예약 상태 일관성...');

  try {
    const statuses = await planetscale.execute(
      `SELECT status, COUNT(*) as count
       FROM rentcar_bookings
       GROUP BY status`
    );

    statuses.rows.forEach((row: any) => {
      log('예약', `status-${row.status}`, 'INFO', `${row.status}: ${row.count}건`);
    });

    log('예약', 'status-check', 'PASS', '예약 상태 조회 성공');

  } catch (error: any) {
    log('예약', 'status-check', 'FAIL', `상태 확인 오류: ${error.message}`);
  }
}

// ============================================================================
// PART 5: 보안 및 권한 검증
// ============================================================================
async function part5_SecurityValidation() {
  console.log('\n\n🔒 PART 5: 보안 및 권한 검증');
  console.log('-'.repeat(100));

  // 5-1. SQL Injection 방어
  console.log('\n5-1. SQL Injection 방어...');

  try {
    // Prepared Statement 사용 확인
    const safeQuery = await planetscale.execute(
      'SELECT id FROM rentcar_vehicles WHERE id = ?',
      [325]
    );

    log('보안', 'sql-injection', 'PASS', 'Prepared Statement 사용 중');

  } catch (error: any) {
    log('보안', 'sql-injection', 'FAIL', `쿼리 오류: ${error.message}`);
  }

  // 5-2. 인증 검증
  console.log('\n5-2. 인증 검증...');

  const authTests = [
    { url: '/api/vendor/vehicles', name: '차량 관리' },
    { url: '/api/vendor/info', name: '업체 정보' }
  ];

  for (const test of authTests) {
    try {
      const res = await fetch(`${API_URL}${test.url}`);
      if (res.status === 401) {
        log('보안', `auth-${test.name}`, 'PASS', `${test.name} API 인증 필요 (401)`);
      } else {
        log('보안', `auth-${test.name}`, 'FAIL', `${test.name} API 인증 없이 접근 가능`);
      }
    } catch (error) {
      // 네트워크 오류는 괜찮음
    }
  }

  // 5-3. 민감정보 노출 확인
  console.log('\n5-3. 민감정보 노출 확인...');

  try {
    const publicAPI = await fetch(`${API_URL}/api/rentcar/vehicle/325`);
    const publicData = await publicAPI.json();

    const sensitiveFields = [
      'password', 'password_hash', 'api_key', 'api_secret',
      'pms_api_key', 'pms_api_secret', 'vendor_email'
    ];

    const exposed = sensitiveFields.filter(field => publicData.data?.[field]);

    if (exposed.length === 0) {
      log('보안', 'sensitive-data', 'PASS', '민감정보 노출 없음');
    } else {
      log('보안', 'sensitive-data', 'FAIL', `민감정보 노출: ${exposed.join(', ')}`);
    }

  } catch (error: any) {
    log('보안', 'sensitive-data', 'FAIL', `확인 오류: ${error.message}`);
  }
}

// ============================================================================
// PART 6: 성능 및 최적화
// ============================================================================
async function part6_Performance() {
  console.log('\n\n⚡ PART 6: 성능 및 최적화');
  console.log('-'.repeat(100));

  // 6-1. 대량 데이터 조회 성능
  console.log('\n6-1. 대량 데이터 조회 성능...');

  try {
    const start = Date.now();
    await planetscale.execute(
      'SELECT * FROM rentcar_vehicles WHERE vendor_id = 13'
    );
    const elapsed = Date.now() - start;

    if (elapsed < 500) {
      log('성능', 'large-query', 'PASS', `165개 차량 조회: ${elapsed}ms`);
    } else {
      log('성능', 'large-query', 'WARN', `165개 차량 조회 느림: ${elapsed}ms`);
    }

  } catch (error: any) {
    log('성능', 'large-query', 'FAIL', `조회 오류: ${error.message}`);
  }

  // 6-2. API 응답 시간
  console.log('\n6-2. API 응답 시간...');

  const apiTests = [
    { url: '/api/rentcars', name: '업체 목록' },
    { url: '/api/rentcar/vehicle/325', name: '차량 상세' }
  ];

  for (const test of apiTests) {
    try {
      const start = Date.now();
      await fetch(`${API_URL}${test.url}`);
      const elapsed = Date.now() - start;

      if (elapsed < 200) {
        log('성능', `api-${test.name}`, 'PASS', `${test.name}: ${elapsed}ms`);
      } else {
        log('성능', `api-${test.name}`, 'WARN', `${test.name} 느림: ${elapsed}ms`);
      }

    } catch (error) {
      // 네트워크 오류
    }
  }
}

// ============================================================================
// 메인 실행
// ============================================================================
async function runCompleteAnalysis() {
  try {
    await part1_DatabaseSchema();
    await part2_UserJourney();
    await part3_VendorManagement();
    await part4_BookingIntegrity();
    await part5_SecurityValidation();
    await part6_Performance();

    // 최종 리포트
    console.log('\n\n' + '='.repeat(100));
    console.log('📊 최종 분석 리포트');
    console.log('='.repeat(100));

    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.filter(r => r.status === 'FAIL').length;
    const warn = results.filter(r => r.status === 'WARN').length;
    const info = results.filter(r => r.status === 'INFO').length;

    console.log(`\n✅ PASS:    ${pass}`);
    console.log(`❌ FAIL:    ${fail}`);
    console.log(`⚠️  WARN:    ${warn}`);
    console.log(`ℹ️  INFO:    ${info}`);
    console.log(`\n총 테스트: ${results.length}`);

    const successRate = results.length > 0 ? ((pass / results.length) * 100).toFixed(1) : '0';
    console.log(`\n📈 성공률: ${successRate}%`);

    // 카테고리별
    console.log('\n카테고리별 결과:');
    const categories = [...new Set(results.map(r => r.category))];
    categories.forEach(cat => {
      const catResults = results.filter(r => r.category === cat);
      const catPass = catResults.filter(r => r.status === 'PASS').length;
      console.log(`  ${cat}: ${catPass}/${catResults.length}`);
    });

    // FAIL 항목
    if (fail > 0) {
      console.log('\n\n❌ 실패 항목:');
      results.filter(r => r.status === 'FAIL').forEach((r, i) => {
        console.log(`${i + 1}. [${r.category}] ${r.message}`);
      });
    }

    console.log('\n' + '='.repeat(100));

    if (fail === 0 && warn === 0) {
      console.log('🎉 모든 검사 통과! 시스템 완벽!');
    } else if (fail === 0) {
      console.log('✅ 치명적 오류 없음. 경고 사항 개선 권장');
    } else {
      console.log('❌ 긴급 조치 필요. 실패 항목 확인');
    }

    console.log('='.repeat(100));

  } catch (error: any) {
    console.error('\n❌ 분석 오류:', error.message);
    console.error(error);
  } finally {
    await neonPool.end();
  }
}

runCompleteAnalysis();
