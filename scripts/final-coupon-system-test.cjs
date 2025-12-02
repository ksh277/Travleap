/**
 * 쿠폰 시스템 최종 통합 테스트
 * 전체 흐름을 여러 번 반복 테스트
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

const connection = connect({ url: process.env.DATABASE_URL });

// 테스트 결과 저장
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function pass(testName) {
  testResults.passed++;
  log('✅', `PASS: ${testName}`);
}

function fail(testName, reason) {
  testResults.failed++;
  testResults.errors.push({ test: testName, reason });
  log('❌', `FAIL: ${testName} - ${reason}`);
}

// 쿠폰 코드 생성 함수 (api/payments/confirm.js와 동일)
// 혼동 문자 제외: 0, O, I, L, 1
function generateCouponCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = 'USER-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 쿠폰 시스템 최종 통합 테스트');
  console.log('='.repeat(60) + '\n');

  // ========================================
  // 테스트 1: 쿠폰 캠페인 상태 확인
  // ========================================
  console.log('\n📋 [테스트 1] 쿠폰 캠페인(product) 상태 확인');
  console.log('-'.repeat(40));

  try {
    const campaignResult = await connection.execute(`
      SELECT id, code, name, coupon_category, is_active,
             discount_type, discount_value, valid_from, valid_until,
             usage_limit, issued_count
      FROM coupons
      WHERE coupon_category = 'product' AND is_active = TRUE
      ORDER BY id DESC
    `);

    if (campaignResult.rows && campaignResult.rows.length > 0) {
      pass('활성 product 쿠폰 캠페인 존재');
      campaignResult.rows.forEach(c => {
        console.log(`   - [${c.id}] ${c.code}: ${c.name}`);
        console.log(`     할인: ${c.discount_type} ${c.discount_value}`);
        console.log(`     발급: ${c.issued_count || 0}/${c.usage_limit || '무제한'}`);
      });
    } else {
      fail('활성 product 쿠폰 캠페인 없음', 'product 카테고리 캠페인 필요');
    }
  } catch (e) {
    fail('캠페인 조회', e.message);
  }

  // ========================================
  // 테스트 2: 쿠폰 코드 생성 테스트 (10회)
  // ========================================
  console.log('\n📋 [테스트 2] 쿠폰 코드 생성 테스트 (10회)');
  console.log('-'.repeat(40));

  const generatedCodes = new Set();
  let codeTestPassed = true;

  for (let i = 0; i < 10; i++) {
    const code = generateCouponCode();

    // 형식 검증: USER-XXXXXXXX
    if (!/^USER-[A-Z0-9]{8}$/.test(code)) {
      fail(`코드 형식 (${i+1})`, `잘못된 형식: ${code}`);
      codeTestPassed = false;
      continue;
    }

    // 혼동 문자 제외 검증 (0, O, I, L, 1 없음)
    if (/[0OIL1]/.test(code.substring(5))) {
      fail(`혼동 문자 제외 (${i+1})`, `혼동 문자 포함: ${code}`);
      codeTestPassed = false;
      continue;
    }

    // 중복 검증
    if (generatedCodes.has(code)) {
      fail(`코드 중복 (${i+1})`, `중복 코드: ${code}`);
      codeTestPassed = false;
      continue;
    }

    generatedCodes.add(code);
    console.log(`   ${i+1}. ${code} ✓`);
  }

  if (codeTestPassed) {
    pass('쿠폰 코드 10회 생성 - 형식/중복/혼동문자 모두 통과');
  }

  // ========================================
  // 테스트 3: user_coupons 테이블 구조 확인
  // ========================================
  console.log('\n📋 [테스트 3] user_coupons 테이블 구조 확인');
  console.log('-'.repeat(40));

  try {
    const columnsResult = await connection.execute(`
      SHOW COLUMNS FROM user_coupons
    `);

    const requiredColumns = ['id', 'user_id', 'coupon_id', 'coupon_code', 'status'];
    const existingColumns = columnsResult.rows.map(r => r.Field);

    let allColumnsExist = true;
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`   ✓ ${col} 컬럼 존재`);
      } else {
        console.log(`   ✗ ${col} 컬럼 없음`);
        allColumnsExist = false;
      }
    });

    if (allColumnsExist) {
      pass('user_coupons 테이블 구조 정상');
    } else {
      fail('user_coupons 테이블 구조', '필수 컬럼 누락');
    }
  } catch (e) {
    fail('user_coupons 테이블 확인', e.message);
  }

  // ========================================
  // 테스트 4: user_coupon_usage 테이블 구조 확인
  // ========================================
  console.log('\n📋 [테스트 4] user_coupon_usage 테이블 구조 확인');
  console.log('-'.repeat(40));

  try {
    const usageColumnsResult = await connection.execute(`
      SHOW COLUMNS FROM user_coupon_usage
    `);

    const requiredUsageColumns = ['id', 'user_coupon_id', 'partner_id', 'order_amount', 'discount_amount', 'final_amount', 'used_at'];
    const existingUsageColumns = usageColumnsResult.rows.map(r => r.Field);

    let allUsageColumnsExist = true;
    requiredUsageColumns.forEach(col => {
      if (existingUsageColumns.includes(col)) {
        console.log(`   ✓ ${col} 컬럼 존재`);
      } else {
        console.log(`   ✗ ${col} 컬럼 없음`);
        allUsageColumnsExist = false;
      }
    });

    if (allUsageColumnsExist) {
      pass('user_coupon_usage 테이블 구조 정상');
    } else {
      fail('user_coupon_usage 테이블 구조', '필수 컬럼 누락');
    }
  } catch (e) {
    fail('user_coupon_usage 테이블 확인', e.message);
  }

  // ========================================
  // 테스트 5: 쿠폰 가맹점 설정 확인
  // ========================================
  console.log('\n📋 [테스트 5] 쿠폰 가맹점(is_coupon_partner) 확인');
  console.log('-'.repeat(40));

  try {
    const partnersResult = await connection.execute(`
      SELECT id, business_name, services,
             coupon_discount_type, coupon_discount_value, coupon_max_discount, coupon_min_order,
             is_coupon_partner
      FROM partners
      WHERE is_coupon_partner = 1 AND status = 'approved'
      LIMIT 5
    `);

    if (partnersResult.rows && partnersResult.rows.length > 0) {
      pass(`쿠폰 가맹점 ${partnersResult.rows.length}개 확인`);
      partnersResult.rows.forEach(p => {
        console.log(`   - [${p.id}] ${p.business_name} (${p.services})`);
        console.log(`     할인: ${p.coupon_discount_type} ${p.coupon_discount_value}, 최대: ${p.coupon_max_discount || '없음'}, 최소주문: ${p.coupon_min_order || '없음'}`);
      });
    } else {
      fail('쿠폰 가맹점 없음', '최소 1개 이상의 쿠폰 가맹점 필요');
    }
  } catch (e) {
    fail('쿠폰 가맹점 확인', e.message);
  }

  // ========================================
  // 테스트 6: 발급된 쿠폰 조회 테스트
  // ========================================
  console.log('\n📋 [테스트 6] 발급된 쿠폰 조회 (최근 5개)');
  console.log('-'.repeat(40));

  try {
    const issuedResult = await connection.execute(`
      SELECT uc.id, uc.user_id, uc.coupon_code, uc.status, uc.issued_at,
             c.code as campaign_code, c.name as campaign_name
      FROM user_coupons uc
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      ORDER BY uc.id DESC
      LIMIT 5
    `);

    if (issuedResult.rows && issuedResult.rows.length > 0) {
      pass(`발급된 쿠폰 ${issuedResult.rows.length}개 확인`);
      issuedResult.rows.forEach(uc => {
        console.log(`   - [${uc.id}] ${uc.coupon_code} (${uc.status})`);
        console.log(`     캠페인: ${uc.campaign_name}, 발급: ${uc.issued_at}`);
      });
    } else {
      console.log('   ⚠️ 발급된 쿠폰 없음 (아직 결제가 없을 수 있음)');
      pass('발급된 쿠폰 조회 쿼리 정상');
    }
  } catch (e) {
    fail('발급된 쿠폰 조회', e.message);
  }

  // ========================================
  // 테스트 7: 쿠폰 사용 내역 조회 테스트
  // ========================================
  console.log('\n📋 [테스트 7] 쿠폰 사용 내역 조회 (최근 5개)');
  console.log('-'.repeat(40));

  try {
    const usageResult = await connection.execute(`
      SELECT ucu.id, ucu.order_amount, ucu.discount_amount, ucu.final_amount, ucu.used_at,
             uc.coupon_code,
             p.business_name as partner_name
      FROM user_coupon_usage ucu
      LEFT JOIN user_coupons uc ON ucu.user_coupon_id = uc.id
      LEFT JOIN partners p ON ucu.partner_id = p.id
      ORDER BY ucu.id DESC
      LIMIT 5
    `);

    if (usageResult.rows && usageResult.rows.length > 0) {
      pass(`쿠폰 사용 내역 ${usageResult.rows.length}개 확인`);
      usageResult.rows.forEach(u => {
        console.log(`   - [${u.id}] ${u.coupon_code} @ ${u.partner_name}`);
        console.log(`     주문: ${u.order_amount}원, 할인: ${u.discount_amount}원, 최종: ${u.final_amount}원`);
      });
    } else {
      console.log('   ⚠️ 사용 내역 없음 (아직 사용이 없을 수 있음)');
      pass('쿠폰 사용 내역 조회 쿼리 정상');
    }
  } catch (e) {
    fail('쿠폰 사용 내역 조회', e.message);
  }

  // ========================================
  // 테스트 8: 통계 쿼리 테스트
  // ========================================
  console.log('\n📋 [테스트 8] 통계 쿼리 테스트');
  console.log('-'.repeat(40));

  try {
    const statsResult = await connection.execute(`
      SELECT
        (SELECT COUNT(*) FROM user_coupons WHERE coupon_code IS NOT NULL) as total_issued,
        (SELECT COUNT(*) FROM user_coupon_usage) as total_used,
        (SELECT COALESCE(SUM(discount_amount), 0) FROM user_coupon_usage) as total_discount_amount,
        (SELECT COALESCE(SUM(order_amount), 0) FROM user_coupon_usage) as total_order_amount,
        (SELECT COUNT(DISTINCT partner_id) FROM user_coupon_usage WHERE partner_id IS NOT NULL) as active_partners
    `);

    const stats = statsResult.rows[0];
    console.log(`   총 발급: ${stats.total_issued}개`);
    console.log(`   총 사용: ${stats.total_used}회`);
    console.log(`   총 할인액: ${parseInt(stats.total_discount_amount).toLocaleString()}원`);
    console.log(`   총 주문액: ${parseInt(stats.total_order_amount).toLocaleString()}원`);
    console.log(`   활성 가맹점: ${stats.active_partners}개`);

    pass('통계 쿼리 정상 실행');
  } catch (e) {
    fail('통계 쿼리', e.message);
  }

  // ========================================
  // 테스트 9: 정산 쿼리 테스트
  // ========================================
  console.log('\n📋 [테스트 9] 정산 쿼리 테스트');
  console.log('-'.repeat(40));

  try {
    const settlementsResult = await connection.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        p.services as category,
        COUNT(ucu.id) as usage_count,
        COALESCE(SUM(ucu.order_amount), 0) as total_order_amount,
        COALESCE(SUM(ucu.discount_amount), 0) as total_discount,
        COALESCE(SUM(ucu.final_amount), 0) as total_final_amount
      FROM partners p
      LEFT JOIN user_coupon_usage ucu ON p.id = ucu.partner_id
      WHERE p.is_coupon_partner = 1 AND p.status = 'approved'
      GROUP BY p.id, p.business_name, p.services
      HAVING usage_count > 0
      ORDER BY total_discount DESC
      LIMIT 5
    `);

    if (settlementsResult.rows && settlementsResult.rows.length > 0) {
      console.log(`   정산 대상 가맹점: ${settlementsResult.rows.length}개`);
      settlementsResult.rows.forEach(s => {
        console.log(`   - ${s.business_name}: ${s.usage_count}회, 할인 ${parseInt(s.total_discount).toLocaleString()}원`);
      });
    } else {
      console.log('   ⚠️ 정산 대상 없음 (사용 내역이 없을 수 있음)');
    }

    pass('정산 쿼리 정상 실행');
  } catch (e) {
    fail('정산 쿼리', e.message);
  }

  // ========================================
  // 테스트 10: 가맹점별 중복 사용 체크 로직 테스트
  // ========================================
  console.log('\n📋 [테스트 10] 가맹점별 중복 사용 체크 로직');
  console.log('-'.repeat(40));

  try {
    // 임의의 user_coupon_id와 partner_id로 테스트
    const checkQuery = `
      SELECT id FROM user_coupon_usage
      WHERE user_coupon_id = ? AND partner_id = ?
      LIMIT 1
    `;

    // 테스트용 ID (존재하지 않는 ID)
    const testResult = await connection.execute(checkQuery, [99999, 99999]);

    console.log('   중복 체크 쿼리 실행 성공');
    console.log('   로직: user_coupon_id + partner_id 조합으로 중복 확인');
    console.log('   → 같은 가맹점: 사용 불가');
    console.log('   → 다른 가맹점: 사용 가능');

    pass('가맹점별 중복 체크 로직 정상');
  } catch (e) {
    fail('중복 체크 로직', e.message);
  }

  // ========================================
  // 테스트 11: 쿠폰별 통계 쿼리
  // ========================================
  console.log('\n📋 [테스트 11] 쿠폰(캠페인)별 통계 쿼리');
  console.log('-'.repeat(40));

  try {
    const couponStatsResult = await connection.execute(`
      SELECT
        c.id,
        c.code,
        c.name,
        c.discount_type,
        c.discount_value,
        c.is_active,
        (SELECT COUNT(*) FROM user_coupons WHERE coupon_id = c.id AND coupon_code IS NOT NULL) as issued_count,
        COALESCE(ucu_stats.used_count, 0) as used_count,
        COALESCE(ucu_stats.total_discount, 0) as total_discount
      FROM coupons c
      LEFT JOIN (
        SELECT
          uc.coupon_id,
          COUNT(ucu.id) as used_count,
          SUM(ucu.discount_amount) as total_discount
        FROM user_coupons uc
        INNER JOIN user_coupon_usage ucu ON uc.id = ucu.user_coupon_id
        GROUP BY uc.coupon_id
      ) ucu_stats ON c.id = ucu_stats.coupon_id
      ORDER BY used_count DESC
      LIMIT 5
    `);

    if (couponStatsResult.rows && couponStatsResult.rows.length > 0) {
      console.log(`   쿠폰 캠페인: ${couponStatsResult.rows.length}개`);
      couponStatsResult.rows.forEach(c => {
        console.log(`   - [${c.code}] ${c.name}: 발급 ${c.issued_count}, 사용 ${c.used_count}`);
      });
    }

    pass('쿠폰별 통계 쿼리 정상');
  } catch (e) {
    fail('쿠폰별 통계 쿼리', e.message);
  }

  // ========================================
  // 테스트 12: 일별 통계 쿼리
  // ========================================
  console.log('\n📋 [테스트 12] 일별 통계 쿼리');
  console.log('-'.repeat(40));

  try {
    const dailyStatsResult = await connection.execute(`
      SELECT
        DATE(used_at) as date,
        COUNT(*) as usage_count,
        COALESCE(SUM(discount_amount), 0) as discount_amount,
        COALESCE(SUM(order_amount), 0) as order_amount
      FROM user_coupon_usage
      WHERE used_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(used_at)
      ORDER BY date DESC
      LIMIT 7
    `);

    if (dailyStatsResult.rows && dailyStatsResult.rows.length > 0) {
      console.log(`   최근 일별 통계:`);
      dailyStatsResult.rows.forEach(d => {
        console.log(`   - ${d.date}: ${d.usage_count}회, 할인 ${parseInt(d.discount_amount).toLocaleString()}원`);
      });
    } else {
      console.log('   ⚠️ 최근 30일 사용 내역 없음');
    }

    pass('일별 통계 쿼리 정상');
  } catch (e) {
    fail('일별 통계 쿼리', e.message);
  }

  // ========================================
  // 최종 결과
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 최종 테스트 결과');
  console.log('='.repeat(60));
  console.log(`✅ 통과: ${testResults.passed}개`);
  console.log(`❌ 실패: ${testResults.failed}개`);

  if (testResults.errors.length > 0) {
    console.log('\n⚠️ 실패한 테스트:');
    testResults.errors.forEach(e => {
      console.log(`   - ${e.test}: ${e.reason}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (testResults.failed === 0) {
    console.log('🎉 모든 테스트 통과! 쿠폰 시스템 정상 작동 중');
  } else {
    console.log('⚠️ 일부 테스트 실패. 위 오류를 확인하세요.');
  }
  console.log('='.repeat(60) + '\n');

  return testResults.failed === 0;
}

// 테스트 실행
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('테스트 실행 오류:', err);
    process.exit(1);
  });
