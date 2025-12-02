/**
 * 프론트엔드 흐름 검증 테스트
 * 결제 성공 페이지, 파트너 대시보드, 쿠폰 사용 API 전체 흐름 테스트
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const fs = require('fs');
const path = require('path');

const connection = connect({ url: process.env.DATABASE_URL });

let testResults = { passed: 0, failed: 0, errors: [] };

function pass(name) {
  testResults.passed++;
  console.log(`✅ PASS: ${name}`);
}

function fail(name, reason) {
  testResults.failed++;
  testResults.errors.push({ name, reason });
  console.log(`❌ FAIL: ${name} - ${reason}`);
}

// 파일 내용 검증
function checkFileContent(filePath, patterns, testName) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let allFound = true;
    let missing = [];

    patterns.forEach(p => {
      if (typeof p === 'string') {
        if (!content.includes(p)) {
          allFound = false;
          missing.push(p.substring(0, 50) + '...');
        }
      } else if (p instanceof RegExp) {
        if (!p.test(content)) {
          allFound = false;
          missing.push(p.toString().substring(0, 50) + '...');
        }
      }
    });

    if (allFound) {
      pass(testName);
      return true;
    } else {
      fail(testName, `Missing: ${missing.join(', ')}`);
      return false;
    }
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 프론트엔드 흐름 검증 테스트');
  console.log('='.repeat(60));

  // ========================================
  // 1. 결제 성공 페이지 검증
  // ========================================
  console.log('\n📋 [1] 결제 성공 페이지 (PaymentSuccessPage.tsx)');
  console.log('-'.repeat(40));

  const paymentSuccessPath = path.join(__dirname, '../components/PaymentSuccessPage.tsx');

  checkFileContent(paymentSuccessPath, [
    'couponData',           // 쿠폰 정보 상태
    'couponData.code',      // 쿠폰 코드 표시
    'couponQrRef',          // QR 코드 ref
    'qr_url',               // QR URL
    '쿠폰이 발급되었습니다', // 발급 메시지
    'copyCouponCode',       // 복사 기능
    'saveCouponImage',      // 저장 기능
  ], '결제 성공 페이지 - 쿠폰 표시 요소');

  checkFileContent(paymentSuccessPath, [
    'navigate',
    '/partners',            // 가맹점 페이지 이동
  ], '결제 성공 페이지 - 가맹점 보기 버튼');

  // ========================================
  // 2. 파트너 대시보드 검증
  // ========================================
  console.log('\n📋 [2] 파트너 대시보드 (PartnerDashboardPageEnhanced.tsx)');
  console.log('-'.repeat(40));

  const partnerDashboardPath = path.join(__dirname, '../components/PartnerDashboardPageEnhanced.tsx');

  checkFileContent(partnerDashboardPath, [
    'searchParams',         // URL 파라미터 처리
    'code=',                // QR에서 전달된 코드
    'setActiveTab',         // 탭 전환
    'scan',                 // 스캔 탭
  ], '파트너 대시보드 - QR 자동 입력');

  checkFileContent(partnerDashboardPath, [
    'coupon_settings',       // 쿠폰 설정 객체
    'discount_type',         // 할인 타입
    'discount_value',        // 할인 값
    'max_discount',          // 최대 할인
  ], '파트너 대시보드 - 가맹점별 할인 설정');

  checkFileContent(partnerDashboardPath, [
    '/api/coupon/use',      // 쿠폰 사용 API 호출
    'order_amount',         // 주문 금액
    'discount_amount',      // 할인 금액
    'final_amount',         // 최종 금액
  ], '파트너 대시보드 - 쿠폰 사용 처리');

  // ========================================
  // 3. 쿠폰 사용 API 검증
  // ========================================
  console.log('\n📋 [3] 쿠폰 사용 API (api/coupon/use.js)');
  console.log('-'.repeat(40));

  const couponUsePath = path.join(__dirname, '../api/coupon/use.js');

  checkFileContent(couponUsePath, [
    'user_coupon_usage',    // 사용 내역 테이블
    'partner_id',           // 가맹점 ID
    'ALREADY_USED_AT_PARTNER', // 중복 사용 에러
    '다른 가맹점에서 사용 가능', // 다른 가맹점 안내
  ], '쿠폰 사용 API - 가맹점별 중복 체크');

  checkFileContent(couponUsePath, [
    'coupon_discount_type',  // 가맹점 할인 적용
    'coupon_discount_value',
    'PERCENT',               // 퍼센트 할인
    'AMOUNT',                // 정액 할인
  ], '쿠폰 사용 API - 가맹점별 할인 적용');

  // ========================================
  // 4. 쿠폰 검증 API 검증
  // ========================================
  console.log('\n📋 [4] 쿠폰 검증 API (api/coupon/validate.js)');
  console.log('-'.repeat(40));

  const couponValidatePath = path.join(__dirname, '../api/coupon/validate.js');

  checkFileContent(couponValidatePath, [
    'coupon_code',          // 쿠폰 코드 조회
    'user_coupons',         // 사용자 쿠폰 테이블
    'uc.status',            // 상태 확인
    'USED',                 // 사용 상태 체크
  ], '쿠폰 검증 API - 기본 검증');

  // ========================================
  // 5. 결제 확인 API 검증 (자동 발급)
  // ========================================
  console.log('\n📋 [5] 결제 확인 API (api/payments/confirm.js)');
  console.log('-'.repeat(40));

  const paymentConfirmPath = path.join(__dirname, '../api/payments/confirm.js');

  checkFileContent(paymentConfirmPath, [
    'issueCampaignCouponForOrder',  // 쿠폰 발급 함수
    'coupon_category',              // product 카테고리
    'product',                      // product 타입
    'USER-',                        // 코드 형식
  ], '결제 확인 API - 쿠폰 자동 발급');

  checkFileContent(paymentConfirmPath, [
    'ABCDEFGHJKMNPQRSTUVWXYZ23456789', // 혼동 문자 제외
    'user_coupons',                     // 발급 테이블
    'coupon_code',                      // 코드 저장
  ], '결제 확인 API - 코드 생성 규칙');

  // ========================================
  // 6. 통계 API 검증
  // ========================================
  console.log('\n📋 [6] 통계 API (api/admin/coupon-stats.js)');
  console.log('-'.repeat(40));

  const couponStatsPath = path.join(__dirname, '../api/admin/coupon-stats.js');

  checkFileContent(couponStatsPath, [
    'user_coupon_usage',    // 사용 내역 테이블 사용
    'total_issued',         // 총 발급
    'total_used',           // 총 사용
    'total_discount_amount',// 총 할인액
  ], '통계 API - 전체 통계');

  checkFileContent(couponStatsPath, [
    'partner_stats',        // 가맹점별 통계
    'daily_stats',          // 일별 통계
    'category_stats',       // 카테고리별 통계
  ], '통계 API - 세부 통계');

  // ========================================
  // 7. 정산 API 검증
  // ========================================
  console.log('\n📋 [7] 정산 API (api/admin/coupon-settlements.js)');
  console.log('-'.repeat(40));

  const couponSettlementsPath = path.join(__dirname, '../api/admin/coupon-settlements.js');

  checkFileContent(couponSettlementsPath, [
    'user_coupon_usage',    // 사용 내역 테이블 사용
    'total_order_amount',   // 총 주문액
    'total_discount',       // 총 할인액
    'total_final_amount',   // 총 최종금액
  ], '정산 API - 가맹점별 정산');

  // ========================================
  // 8. DB 실제 데이터 검증
  // ========================================
  console.log('\n📋 [8] DB 데이터 무결성 검증');
  console.log('-'.repeat(40));

  try {
    // 발급된 쿠폰 코드 형식 검증
    const couponsResult = await connection.execute(`
      SELECT coupon_code FROM user_coupons
      WHERE coupon_code LIKE 'USER-%'
      LIMIT 10
    `);

    if (couponsResult.rows) {
      let validFormat = true;
      couponsResult.rows.forEach(c => {
        if (!/^USER-[A-Z0-9]{8}$/.test(c.coupon_code)) {
          validFormat = false;
        }
        // 혼동 문자 체크
        if (/[0OIL1]/.test(c.coupon_code.substring(5))) {
          validFormat = false;
        }
      });

      if (validFormat || couponsResult.rows.length === 0) {
        pass('DB 쿠폰 코드 형식 검증');
      } else {
        fail('DB 쿠폰 코드 형식', '잘못된 형식의 코드 존재');
      }
    }
  } catch (e) {
    fail('DB 검증', e.message);
  }

  // ========================================
  // 9. 가맹점 할인 설정 검증
  // ========================================
  console.log('\n📋 [9] 가맹점 할인 설정 검증');
  console.log('-'.repeat(40));

  try {
    const partnersResult = await connection.execute(`
      SELECT id, business_name,
             coupon_discount_type, coupon_discount_value,
             coupon_max_discount, coupon_min_order
      FROM partners
      WHERE is_coupon_partner = 1 AND status = 'approved'
      LIMIT 5
    `);

    if (partnersResult.rows && partnersResult.rows.length > 0) {
      let validSettings = true;
      partnersResult.rows.forEach(p => {
        if (!p.coupon_discount_type || !p.coupon_discount_value) {
          validSettings = false;
        }
        if (p.coupon_discount_type !== 'percent' && p.coupon_discount_type !== 'fixed') {
          validSettings = false;
        }
        console.log(`   - ${p.business_name}: ${p.coupon_discount_type} ${p.coupon_discount_value}`);
      });

      if (validSettings) {
        pass('가맹점 할인 설정 유효성');
      } else {
        fail('가맹점 할인 설정', '잘못된 설정 존재');
      }
    } else {
      fail('가맹점 없음', '쿠폰 가맹점 필요');
    }
  } catch (e) {
    fail('가맹점 검증', e.message);
  }

  // ========================================
  // 최종 결과
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 프론트엔드 흐름 검증 결과');
  console.log('='.repeat(60));
  console.log(`✅ 통과: ${testResults.passed}개`);
  console.log(`❌ 실패: ${testResults.failed}개`);

  if (testResults.errors.length > 0) {
    console.log('\n⚠️ 실패 항목:');
    testResults.errors.forEach(e => {
      console.log(`   - ${e.name}: ${e.reason}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  if (testResults.failed === 0) {
    console.log('🎉 모든 프론트엔드 흐름 검증 통과!');
  } else {
    console.log('⚠️ 일부 검증 실패. 위 오류 확인 필요.');
  }
  console.log('='.repeat(60) + '\n');

  return testResults.failed === 0;
}

runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(e => {
    console.error('테스트 오류:', e);
    process.exit(1);
  });
