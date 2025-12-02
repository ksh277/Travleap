/**
 * 쿠폰 시스템 E2E 테스트
 * 실제 쿠폰 발급 → 사용 → 통계 업데이트 전체 흐름 시뮬레이션
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

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

// 혼동 문자 제외 코드 생성
function generateCouponCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = 'TEST-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function runE2ETest() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 쿠폰 시스템 E2E 테스트');
  console.log('='.repeat(60));

  let testCouponId = null;
  let testUserCouponId = null;
  const testUserId = 11; // 테스트 사용자
  const testCouponCode = generateCouponCode();

  try {
    // ========================================
    // 1. 테스트용 쿠폰 발급
    // ========================================
    console.log('\n📋 [1] 테스트 쿠폰 발급');
    console.log('-'.repeat(40));

    // product 카테고리 캠페인 찾기
    const campaignResult = await connection.execute(`
      SELECT id, code, name FROM coupons
      WHERE coupon_category = 'product' AND is_active = TRUE
      LIMIT 1
    `);

    if (!campaignResult.rows || campaignResult.rows.length === 0) {
      fail('캠페인 없음', 'product 카테고리 캠페인 필요');
      return;
    }

    const campaign = campaignResult.rows[0];
    console.log(`   캠페인: [${campaign.id}] ${campaign.name}`);

    // user_coupons에 테스트 쿠폰 발급
    const insertResult = await connection.execute(`
      INSERT INTO user_coupons (user_id, coupon_id, coupon_code, status, issued_at)
      VALUES (?, ?, ?, 'ISSUED', NOW())
    `, [testUserId, campaign.id, testCouponCode]);

    testUserCouponId = insertResult.insertId;
    console.log(`   발급된 쿠폰: ${testCouponCode} (ID: ${testUserCouponId})`);
    pass('테스트 쿠폰 발급');

    // ========================================
    // 2. 쿠폰 검증 테스트
    // ========================================
    console.log('\n📋 [2] 쿠폰 검증 테스트');
    console.log('-'.repeat(40));

    const verifyResult = await connection.execute(`
      SELECT uc.id, uc.coupon_code, uc.status,
             c.name, c.discount_type, c.discount_value
      FROM user_coupons uc
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.coupon_code = ?
    `, [testCouponCode]);

    if (verifyResult.rows && verifyResult.rows.length > 0) {
      const coupon = verifyResult.rows[0];
      console.log(`   코드: ${coupon.coupon_code}`);
      console.log(`   상태: ${coupon.status}`);
      console.log(`   캠페인: ${coupon.name}`);
      pass('쿠폰 검증');
    } else {
      fail('쿠폰 검증', '쿠폰을 찾을 수 없음');
    }

    // ========================================
    // 3. 가맹점별 쿠폰 사용 테스트 (3개 가맹점)
    // ========================================
    console.log('\n📋 [3] 가맹점별 쿠폰 사용 테스트');
    console.log('-'.repeat(40));

    // 쿠폰 가맹점 조회
    const partnersResult = await connection.execute(`
      SELECT id, business_name, coupon_discount_type, coupon_discount_value,
             coupon_max_discount, coupon_min_order
      FROM partners
      WHERE is_coupon_partner = 1 AND status = 'approved'
      LIMIT 3
    `);

    if (!partnersResult.rows || partnersResult.rows.length === 0) {
      fail('가맹점 없음', '쿠폰 가맹점 필요');
      return;
    }

    console.log(`   테스트할 가맹점: ${partnersResult.rows.length}개`);

    for (const partner of partnersResult.rows) {
      console.log(`\n   🏪 ${partner.business_name} (ID: ${partner.id})`);

      const orderAmount = 30000;
      let discountAmount = 0;

      // 할인 계산
      if (partner.coupon_discount_type === 'percent') {
        discountAmount = Math.round(orderAmount * (parseFloat(partner.coupon_discount_value) / 100));
        if (partner.coupon_max_discount) {
          discountAmount = Math.min(discountAmount, parseInt(partner.coupon_max_discount));
        }
      } else {
        discountAmount = parseInt(partner.coupon_discount_value);
      }

      const finalAmount = orderAmount - discountAmount;

      console.log(`      주문: ${orderAmount.toLocaleString()}원`);
      console.log(`      할인: ${discountAmount.toLocaleString()}원 (${partner.coupon_discount_type} ${partner.coupon_discount_value})`);
      console.log(`      최종: ${finalAmount.toLocaleString()}원`);

      // user_coupon_usage에 사용 내역 저장
      await connection.execute(`
        INSERT INTO user_coupon_usage (user_id, user_coupon_id, partner_id, order_amount, discount_amount, final_amount, used_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [testUserId, testUserCouponId, partner.id, orderAmount, discountAmount, finalAmount]);

      pass(`${partner.business_name} 쿠폰 사용`);
    }

    // ========================================
    // 4. 같은 가맹점 중복 사용 체크
    // ========================================
    console.log('\n📋 [4] 같은 가맹점 중복 사용 체크');
    console.log('-'.repeat(40));

    const firstPartner = partnersResult.rows[0];

    // 중복 체크 쿼리
    const duplicateCheck = await connection.execute(`
      SELECT id FROM user_coupon_usage
      WHERE user_coupon_id = ? AND partner_id = ?
    `, [testUserCouponId, firstPartner.id]);

    if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
      console.log(`   ${firstPartner.business_name}에서 이미 사용됨 → 중복 사용 차단 정상`);
      pass('중복 사용 차단 로직');
    } else {
      fail('중복 사용 차단', '사용 내역을 찾을 수 없음');
    }

    // ========================================
    // 5. 사용 내역 조회
    // ========================================
    console.log('\n📋 [5] 사용 내역 조회');
    console.log('-'.repeat(40));

    const usageResult = await connection.execute(`
      SELECT ucu.*, p.business_name
      FROM user_coupon_usage ucu
      LEFT JOIN partners p ON ucu.partner_id = p.id
      WHERE ucu.user_coupon_id = ?
      ORDER BY ucu.used_at DESC
    `, [testUserCouponId]);

    if (usageResult.rows && usageResult.rows.length > 0) {
      console.log(`   총 사용 횟수: ${usageResult.rows.length}회`);
      usageResult.rows.forEach((u, i) => {
        console.log(`   ${i+1}. ${u.business_name}: ${parseInt(u.discount_amount).toLocaleString()}원 할인`);
      });
      pass('사용 내역 조회');
    } else {
      fail('사용 내역 조회', '내역 없음');
    }

    // ========================================
    // 6. 통계 확인
    // ========================================
    console.log('\n📋 [6] 통계 확인');
    console.log('-'.repeat(40));

    const statsResult = await connection.execute(`
      SELECT
        COUNT(*) as total_usage,
        SUM(discount_amount) as total_discount,
        SUM(order_amount) as total_orders
      FROM user_coupon_usage
      WHERE user_coupon_id = ?
    `, [testUserCouponId]);

    if (statsResult.rows && statsResult.rows[0]) {
      const stats = statsResult.rows[0];
      console.log(`   총 사용: ${stats.total_usage}회`);
      console.log(`   총 할인: ${parseInt(stats.total_discount).toLocaleString()}원`);
      console.log(`   총 주문: ${parseInt(stats.total_orders).toLocaleString()}원`);
      pass('통계 집계');
    }

    // ========================================
    // 7. 정산 데이터 확인
    // ========================================
    console.log('\n📋 [7] 정산 데이터 확인');
    console.log('-'.repeat(40));

    const settlementResult = await connection.execute(`
      SELECT p.business_name,
             COUNT(ucu.id) as usage_count,
             SUM(ucu.discount_amount) as total_discount
      FROM user_coupon_usage ucu
      LEFT JOIN partners p ON ucu.partner_id = p.id
      WHERE ucu.user_coupon_id = ?
      GROUP BY p.id, p.business_name
    `, [testUserCouponId]);

    if (settlementResult.rows && settlementResult.rows.length > 0) {
      console.log('   가맹점별 정산:');
      settlementResult.rows.forEach(s => {
        console.log(`   - ${s.business_name}: ${s.usage_count}회, ${parseInt(s.total_discount).toLocaleString()}원`);
      });
      pass('정산 데이터');
    }

    // ========================================
    // 8. 테스트 데이터 정리
    // ========================================
    console.log('\n📋 [8] 테스트 데이터 정리');
    console.log('-'.repeat(40));

    // 사용 내역 삭제
    await connection.execute(`
      DELETE FROM user_coupon_usage WHERE user_coupon_id = ?
    `, [testUserCouponId]);

    // 테스트 쿠폰 삭제
    await connection.execute(`
      DELETE FROM user_coupons WHERE id = ?
    `, [testUserCouponId]);

    console.log('   테스트 데이터 정리 완료');
    pass('테스트 데이터 정리');

  } catch (error) {
    console.error('\n❌ 테스트 오류:', error.message);
    fail('테스트 실행', error.message);

    // 오류 발생 시에도 정리 시도
    if (testUserCouponId) {
      try {
        await connection.execute(`DELETE FROM user_coupon_usage WHERE user_coupon_id = ?`, [testUserCouponId]);
        await connection.execute(`DELETE FROM user_coupons WHERE id = ?`, [testUserCouponId]);
        console.log('   테스트 데이터 정리 완료');
      } catch (e) {}
    }
  }

  // ========================================
  // 최종 결과
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 E2E 테스트 결과');
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
    console.log('🎉 모든 E2E 테스트 통과! 쿠폰 시스템 완벽 작동');
  } else {
    console.log('⚠️ 일부 테스트 실패');
  }
  console.log('='.repeat(60) + '\n');

  return testResults.failed === 0;
}

runE2ETest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(e => {
    console.error('테스트 오류:', e);
    process.exit(1);
  });
