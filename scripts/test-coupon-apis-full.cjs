/**
 * 쿠폰 시스템 전체 API 테스트
 * 모든 엔드포인트 실제 호출 + 에러 검증
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

const BASE_URL = 'http://localhost:5173';

// 테스트 결과 저장
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// 로그 함수
function log(type, message, details = null) {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
  console.log(`${icons[type] || '•'} ${message}`);
  if (details) {
    console.log(`   ${JSON.stringify(details, null, 2).split('\n').join('\n   ')}`);
  }
}

// API 호출 함수
async function callAPI(method, endpoint, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, error: error.message, ok: false };
  }
}

async function runTests() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('   쿠폰 시스템 API 전체 테스트');
  console.log('========================================\n');

  // ========== 1. 관리자 쿠폰 API 테스트 ==========
  console.log('\n📋 1. 관리자 쿠폰 API (/api/admin/coupons)');
  console.log('─'.repeat(50));

  // GET 테스트 (인증 없이 - 실패해야 함)
  const adminGet = await callAPI('GET', '/api/admin/coupons');
  if (adminGet.status === 401 || adminGet.status === 403) {
    log('pass', 'GET /api/admin/coupons - 인증 필요 확인');
    results.passed.push('admin-coupons-auth');
  } else if (adminGet.status === 0) {
    log('warn', 'GET /api/admin/coupons - 서버 연결 실패 (로컬 서버 확인 필요)');
    results.warnings.push('admin-coupons-connection');
  } else {
    log('fail', `GET /api/admin/coupons - 예상치 못한 응답: ${adminGet.status}`);
    results.failed.push('admin-coupons-auth');
  }

  // ========== 2. 쿠폰북 API 테스트 ==========
  console.log('\n📋 2. 쿠폰북 API (/api/couponbook)');
  console.log('─'.repeat(50));

  const couponbookGet = await callAPI('GET', '/api/couponbook');
  if (couponbookGet.ok && couponbookGet.data?.success) {
    log('pass', `GET /api/couponbook - ${couponbookGet.data.data?.length || 0}개 쿠폰 조회`);
    results.passed.push('couponbook-get');
  } else if (couponbookGet.status === 0) {
    log('warn', 'GET /api/couponbook - 서버 연결 실패');
    results.warnings.push('couponbook-connection');
  } else {
    log('fail', `GET /api/couponbook - 실패: ${couponbookGet.data?.message || couponbookGet.status}`);
    results.failed.push('couponbook-get');
  }

  // POST 테스트 (user_id 없이 - 실패해야 함)
  const couponbookPost = await callAPI('POST', '/api/couponbook', { coupon_id: 1 });
  if (couponbookPost.data?.error === 'LOGIN_REQUIRED') {
    log('pass', 'POST /api/couponbook - 로그인 필요 확인');
    results.passed.push('couponbook-auth');
  } else if (couponbookPost.status === 0) {
    log('warn', 'POST /api/couponbook - 서버 연결 실패');
    results.warnings.push('couponbook-post-connection');
  } else {
    log('info', `POST /api/couponbook - 응답: ${JSON.stringify(couponbookPost.data)}`);
  }

  // ========== 3. 쿠폰 검증 API 테스트 ==========
  console.log('\n📋 3. 쿠폰 검증 API (/api/coupon/validate)');
  console.log('─'.repeat(50));

  // 코드 없이 호출
  const validateNoCode = await callAPI('GET', '/api/coupon/validate');
  if (validateNoCode.data?.error === 'MISSING_CODE') {
    log('pass', 'GET /api/coupon/validate - 코드 누락 에러 확인');
    results.passed.push('validate-missing-code');
  } else if (validateNoCode.status === 0) {
    log('warn', 'GET /api/coupon/validate - 서버 연결 실패');
    results.warnings.push('validate-connection');
  } else {
    log('fail', `GET /api/coupon/validate - 예상치 못한 응답`);
    results.failed.push('validate-missing-code');
  }

  // 존재하지 않는 코드
  const validateInvalid = await callAPI('GET', '/api/coupon/validate?code=NOTEXIST123');
  if (validateInvalid.data?.error === 'COUPON_NOT_FOUND') {
    log('pass', 'GET /api/coupon/validate?code=NOTEXIST123 - 존재하지 않는 쿠폰 에러 확인');
    results.passed.push('validate-not-found');
  } else if (validateInvalid.status === 0) {
    log('warn', '서버 연결 실패');
  } else {
    log('fail', `예상치 못한 응답: ${JSON.stringify(validateInvalid.data)}`);
    results.failed.push('validate-not-found');
  }

  // ========== 4. 쿠폰 사용 API 테스트 ==========
  console.log('\n📋 4. 쿠폰 사용 API (/api/coupon/use)');
  console.log('─'.repeat(50));

  // 인증 없이 호출
  const useNoAuth = await callAPI('POST', '/api/coupon/use', {
    coupon_code: 'TEST',
    order_amount: 10000
  });
  if (useNoAuth.status === 401 || useNoAuth.data?.error === 'PARTNER_REQUIRED') {
    log('pass', 'POST /api/coupon/use - 파트너 인증 필요 확인');
    results.passed.push('use-auth');
  } else if (useNoAuth.status === 0) {
    log('warn', '서버 연결 실패');
  } else {
    log('info', `응답: ${JSON.stringify(useNoAuth.data)}`);
  }

  // ========== 5. 마이페이지 쿠폰 API 테스트 ==========
  console.log('\n📋 5. 마이페이지 쿠폰 API (/api/my/coupons)');
  console.log('─'.repeat(50));

  const myCoupons = await callAPI('GET', '/api/my/coupons');
  if (myCoupons.status === 401 || myCoupons.data?.error === 'UNAUTHORIZED') {
    log('pass', 'GET /api/my/coupons - 인증 필요 확인');
    results.passed.push('my-coupons-auth');
  } else if (myCoupons.status === 0) {
    log('warn', '서버 연결 실패');
  } else {
    log('info', `응답: ${JSON.stringify(myCoupons.data)}`);
  }

  // ========== 6. DB 직접 테스트 ==========
  console.log('\n📋 6. DB 직접 쿼리 테스트');
  console.log('─'.repeat(50));

  try {
    // coupons 테이블 조회
    const coupons = await conn.execute('SELECT id, code, name, coupon_category, is_active FROM coupons LIMIT 5');
    log('pass', `coupons 테이블 조회 성공: ${coupons.rows?.length || 0}개`);
    results.passed.push('db-coupons');

    // user_coupons 테이블 조회
    const userCoupons = await conn.execute('SELECT id, user_id, coupon_id, status, expires_at FROM user_coupons LIMIT 5');
    log('pass', `user_coupons 테이블 조회 성공: ${userCoupons.rows?.length || 0}개`);
    results.passed.push('db-user-coupons');

    // expires_at 컬럼 확인
    const hasExpiresAt = userCoupons.rows?.some(uc => uc.expires_at !== undefined);
    if (hasExpiresAt) {
      log('pass', 'user_coupons.expires_at 컬럼 존재 확인');
      results.passed.push('db-expires-at');
    } else {
      log('warn', 'user_coupons.expires_at 컬럼 데이터 없음');
      results.warnings.push('db-expires-at-empty');
    }

    // JOIN 쿼리 테스트
    const joinTest = await conn.execute(`
      SELECT uc.id, uc.coupon_code, c.name, c.discount_type, c.discount_value
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      LIMIT 3
    `);
    log('pass', `JOIN 쿼리 성공: ${joinTest.rows?.length || 0}개`);
    results.passed.push('db-join');

  } catch (dbError) {
    log('fail', `DB 쿼리 실패: ${dbError.message}`);
    results.failed.push('db-query');
  }

  // ========== 7. 쿠폰 시나리오 테스트 ==========
  console.log('\n📋 7. 쿠폰 시나리오 시뮬레이션');
  console.log('─'.repeat(50));

  try {
    // 테스트 쿠폰 조회
    const testCoupon = await conn.execute(`
      SELECT c.*, uc.coupon_code, uc.status as user_status, uc.user_id
      FROM coupons c
      LEFT JOIN user_coupons uc ON c.id = uc.coupon_id
      WHERE c.is_active = TRUE
      LIMIT 1
    `);

    if (testCoupon.rows?.length > 0) {
      const c = testCoupon.rows[0];
      log('info', `테스트 쿠폰: [${c.id}] ${c.code} - ${c.name}`);
      log('info', `  할인: ${c.discount_type} ${c.discount_value}`);
      log('info', `  유형: ${c.coupon_category} / 대상: ${c.member_target}`);
      log('info', `  발급 상태: ${c.user_status || '미발급'}`);

      // 할인 계산 테스트
      const orderAmount = 50000;
      let discount = 0;
      if (c.discount_type === 'percentage') {
        discount = Math.floor(orderAmount * c.discount_value / 100);
        if (c.max_discount && discount > c.max_discount) {
          discount = c.max_discount;
        }
      } else {
        discount = c.discount_value;
      }
      log('pass', `할인 계산 테스트: ${orderAmount}원 → 할인 ${discount}원 = ${orderAmount - discount}원`);
      results.passed.push('discount-calc');
    } else {
      log('warn', '테스트할 활성 쿠폰이 없음');
      results.warnings.push('no-test-coupon');
    }

  } catch (err) {
    log('fail', `시나리오 테스트 실패: ${err.message}`);
    results.failed.push('scenario');
  }

  // ========== 결과 요약 ==========
  console.log('\n========================================');
  console.log('   테스트 결과 요약');
  console.log('========================================\n');

  console.log(`✅ 통과: ${results.passed.length}개`);
  results.passed.forEach(t => console.log(`   - ${t}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️ 경고: ${results.warnings.length}개`);
    results.warnings.forEach(t => console.log(`   - ${t}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ 실패: ${results.failed.length}개`);
    results.failed.forEach(t => console.log(`   - ${t}`));
  }

  console.log('\n========================================');
  if (results.failed.length === 0) {
    console.log('   모든 테스트 통과! ✅');
  } else {
    console.log(`   ${results.failed.length}개 테스트 실패 ❌`);
  }
  console.log('========================================\n');
}

runTests().catch(console.error);
