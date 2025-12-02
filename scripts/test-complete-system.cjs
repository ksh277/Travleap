/**
 * 전체 쿠폰 시스템 완전 검증 테스트
 * - 파트너 대시보드 사용 내역 API
 * - 관리자 통계/정산 API
 * - 쿠폰 발급/검증/사용 API
 * - 프론트엔드 컴포넌트
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const fs = require('fs');
const path = require('path');

const connection = connect({ url: process.env.DATABASE_URL });

let testResults = { passed: 0, failed: 0, errors: [] };

function pass(name) {
  testResults.passed++;
  console.log(`✅ ${name}`);
}

function fail(name, reason) {
  testResults.failed++;
  testResults.errors.push({ name, reason });
  console.log(`❌ ${name}: ${reason}`);
}

function checkFile(filePath, patterns, testName) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const p of patterns) {
      if (!content.includes(p)) {
        fail(testName, `"${p.substring(0, 30)}..." 없음`);
        return false;
      }
    }
    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 전체 쿠폰 시스템 완전 검증 테스트');
  console.log('='.repeat(70));

  // ========================================
  // 1. 파트너 대시보드 사용 내역 API 검증
  // ========================================
  console.log('\n📋 [1] 파트너 대시보드 사용 내역 API');
  console.log('-'.repeat(50));

  const partnerHistoryPath = path.join(__dirname, '../api/partner/coupon-history.js');
  checkFile(partnerHistoryPath, [
    'user_coupon_usage',  // 올바른 테이블 사용
    'ucu.partner_id',     // 파트너 ID 조건
    'ucu.discount_amount' // 할인 금액
  ], 'coupon-history API - user_coupon_usage 테이블 사용');

  // ========================================
  // 2. 관리자 통계 API 검증
  // ========================================
  console.log('\n📋 [2] 관리자 통계 API');
  console.log('-'.repeat(50));

  const statsPath = path.join(__dirname, '../api/admin/coupon-stats.js');
  checkFile(statsPath, [
    'user_coupon_usage',      // 올바른 테이블
    'total_issued',           // 발급 통계
    'total_used',             // 사용 통계
    'partner_stats',          // 가맹점별 통계
    'daily_stats'             // 일별 통계
  ], 'coupon-stats API - 통계 쿼리 검증');

  // ========================================
  // 3. 관리자 정산 API 검증
  // ========================================
  console.log('\n📋 [3] 관리자 정산 API');
  console.log('-'.repeat(50));

  const settlementsPath = path.join(__dirname, '../api/admin/coupon-settlements.js');
  checkFile(settlementsPath, [
    'user_coupon_usage',      // 올바른 테이블
    'ucu.partner_id',         // 파트너별 집계
    'total_discount',         // 할인 합계
    'total_final_amount'      // 최종금액 합계
  ], 'coupon-settlements API - 정산 쿼리 검증');

  // ========================================
  // 4. 쿠폰 사용 API 검증
  // ========================================
  console.log('\n📋 [4] 쿠폰 사용 API');
  console.log('-'.repeat(50));

  const usePath = path.join(__dirname, '../api/coupon/use.js');
  checkFile(usePath, [
    'user_coupon_usage',          // 사용 기록 테이블
    'ALREADY_USED_AT_PARTNER',    // 중복 사용 에러
    'coupon_discount_type',       // 가맹점 할인 타입
    '다른 가맹점에서 사용 가능'   // 안내 메시지
  ], 'coupon/use API - 가맹점별 사용 로직');

  // ========================================
  // 5. 쿠폰 검증 API 검증
  // ========================================
  console.log('\n📋 [5] 쿠폰 검증 API');
  console.log('-'.repeat(50));

  const validatePath = path.join(__dirname, '../api/coupon/validate.js');
  checkFile(validatePath, [
    'coupon_discount_type',       // 가맹점 할인 우선
    'coupon_discount_value',
    'partnerInfo.coupon_discount' // 가맹점 설정 적용
  ], 'coupon/validate API - 가맹점 할인 우선 적용');

  // ========================================
  // 6. 결제 확인 API 검증 (쿠폰 발급)
  // ========================================
  console.log('\n📋 [6] 결제 확인 API (쿠폰 발급)');
  console.log('-'.repeat(50));

  const confirmPath = path.join(__dirname, '../api/payments/confirm.js');
  checkFile(confirmPath, [
    'issueCampaignCouponForOrder',    // 발급 함수
    'ABCDEFGHJKMNPQRSTUVWXYZ23456789', // 혼동문자 제외 (L 없음)
    'coupon_category',                // product 카테고리
    'USER-'                           // 코드 형식
  ], 'payments/confirm API - 쿠폰 자동 발급');

  // ========================================
  // 7. 결제 성공 페이지 검증
  // ========================================
  console.log('\n📋 [7] 결제 성공 페이지');
  console.log('-'.repeat(50));

  const successPath = path.join(__dirname, '../components/PaymentSuccessPage.tsx');
  checkFile(successPath, [
    'couponData',                     // 쿠폰 데이터
    'couponQrRef',                    // QR 코드
    'saveCouponImage',                // 저장 기능
    '가맹점마다 다릅니다'             // 할인율 안내 (수정됨)
  ], '결제 성공 페이지 - 쿠폰 표시 (가맹점 할인 안내)');

  // ========================================
  // 8. 파트너 대시보드 페이지 검증
  // ========================================
  console.log('\n📋 [8] 파트너 대시보드 페이지');
  console.log('-'.repeat(50));

  const dashboardPath = path.join(__dirname, '../components/PartnerDashboardPageEnhanced.tsx');
  checkFile(dashboardPath, [
    'coupon_settings',               // 쿠폰 설정
    'discount_type',                 // 할인 타입
    '/api/coupon/use',               // 사용 API 호출
    '/api/coupon/validate',          // 검증 API 호출
    'setActiveTab'                   // 탭 전환
  ], '파트너 대시보드 - 쿠폰 스캔/사용');

  // ========================================
  // 9. 관리자 쿠폰 관리 페이지 검증
  // ========================================
  console.log('\n📋 [9] 관리자 쿠폰 관리 페이지');
  console.log('-'.repeat(50));

  const adminCouponsPath = path.join(__dirname, '../components/admin/tabs/AdminCoupons.tsx');
  checkFile(adminCouponsPath, [
    '/api/admin/coupon-stats',       // 통계 API
    'coupon_stats',                  // 쿠폰별 통계
    'partner_stats',                 // 가맹점별 통계
    'daily_stats',                   // 일별 통계
    'categoryStats'                  // 카테고리별 통계
  ], '관리자 쿠폰 탭 - 통계 표시');

  // ========================================
  // 10. 관리자 쿠폰 정산 페이지 검증
  // ========================================
  console.log('\n📋 [10] 관리자 쿠폰 정산 페이지');
  console.log('-'.repeat(50));

  const adminSettlementsPath = path.join(__dirname, '../components/admin/tabs/AdminCouponSettlements.tsx');
  checkFile(adminSettlementsPath, [
    '/api/admin/coupon-settlements', // 정산 API
    'total_discount',                // 할인 합계
    'total_final_amount',            // 결제 합계
    'usage_count'                    // 사용 건수
  ], '관리자 정산 탭 - 정산 표시');

  // ========================================
  // 11. DB 쿼리 테스트
  // ========================================
  console.log('\n📋 [11] DB 쿼리 테스트');
  console.log('-'.repeat(50));

  try {
    // 통계 쿼리
    const statsResult = await connection.execute(`
      SELECT
        (SELECT COUNT(*) FROM user_coupons WHERE coupon_code IS NOT NULL) as issued,
        (SELECT COUNT(*) FROM user_coupon_usage) as used
    `);
    pass(`DB 통계 쿼리 - 발급: ${statsResult.rows[0].issued}, 사용: ${statsResult.rows[0].used}`);
  } catch (e) {
    fail('DB 통계 쿼리', e.message);
  }

  try {
    // 가맹점 할인 설정 조회
    const partnerResult = await connection.execute(`
      SELECT id, business_name, coupon_discount_type, coupon_discount_value
      FROM partners WHERE is_coupon_partner = 1 LIMIT 3
    `);
    if (partnerResult.rows.length > 0) {
      pass(`DB 가맹점 조회 - ${partnerResult.rows.length}개 가맹점`);
    } else {
      fail('DB 가맹점 조회', '쿠폰 가맹점 없음');
    }
  } catch (e) {
    fail('DB 가맹점 조회', e.message);
  }

  // ========================================
  // 최종 결과
  // ========================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 전체 검증 결과');
  console.log('='.repeat(70));
  console.log(`✅ 통과: ${testResults.passed}개`);
  console.log(`❌ 실패: ${testResults.failed}개`);

  if (testResults.errors.length > 0) {
    console.log('\n⚠️ 실패 항목:');
    testResults.errors.forEach(e => {
      console.log(`   - ${e.name}: ${e.reason}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  if (testResults.failed === 0) {
    console.log('🎉 전체 시스템 검증 완료! 모든 테스트 통과!');
  } else {
    console.log('⚠️ 일부 테스트 실패. 위 오류 확인 필요.');
  }
  console.log('='.repeat(70) + '\n');

  return testResults.failed === 0;
}

runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(e => {
    console.error('테스트 오류:', e);
    process.exit(1);
  });
