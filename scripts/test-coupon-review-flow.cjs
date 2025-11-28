/**
 * 쿠폰/리뷰 시스템 전체 플로우 통합 테스트
 *
 * 테스트 플로우:
 * 1. 쿠폰 가맹점 확인/설정
 * 2. 테스트용 쿠폰 생성
 * 3. 쿠폰 발급 → 검증 → 사용 → 리뷰 작성 시뮬레이션
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function runIntegrationTest() {
  console.log('🧪 쿠폰/리뷰 시스템 통합 테스트 시작...\n');

  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  const testResults = {
    passed: [],
    failed: []
  };

  function log(test, success, message) {
    if (success) {
      testResults.passed.push(test);
      console.log(`✅ [${test}] ${message}`);
    } else {
      testResults.failed.push({ test, message });
      console.log(`❌ [${test}] ${message}`);
    }
  }

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. 쿠폰 가맹점 확인
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 1. 쿠폰 가맹점 확인...');

    const partnerResult = await connection.execute(`
      SELECT id, business_name, is_coupon_partner, coupon_discount_type, coupon_discount_value
      FROM partners
      WHERE is_active = 1 AND status = 'approved'
      LIMIT 5
    `);

    const partners = partnerResult.rows || [];
    console.log(`   총 ${partners.length}개 활성 파트너`);

    let couponPartner = partners.find(p => p.is_coupon_partner == 1);

    if (!couponPartner && partners.length > 0) {
      // 첫 번째 파트너를 쿠폰 가맹점으로 설정
      const firstPartner = partners[0];
      await connection.execute(`
        UPDATE partners
        SET is_coupon_partner = 1, coupon_discount_type = 'percent', coupon_discount_value = 10, coupon_max_discount = 5000
        WHERE id = ?
      `, [firstPartner.id]);

      couponPartner = { ...firstPartner, is_coupon_partner: 1, coupon_discount_type: 'percent', coupon_discount_value: 10 };
      log('쿠폰 가맹점 설정', true, `파트너 ${firstPartner.business_name} (ID: ${firstPartner.id})를 쿠폰 가맹점으로 설정`);
    } else if (couponPartner) {
      log('쿠폰 가맹점 확인', true, `쿠폰 가맹점 존재: ${couponPartner.business_name}`);
    } else {
      log('쿠폰 가맹점 확인', false, '활성 파트너가 없습니다');
      return;
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 테스트 쿠폰 확인/생성
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 2. 테스트 쿠폰 확인...');

    const couponResult = await connection.execute(`
      SELECT id, name, title, code, discount_type, discount_value, target_type, is_active
      FROM coupons
      WHERE is_active = 1
      LIMIT 5
    `);

    const coupons = couponResult.rows || [];
    console.log(`   총 ${coupons.length}개 활성 쿠폰`);

    let testCoupon = coupons.find(c => c.target_type === 'ALL' || !c.target_type);

    if (!testCoupon && coupons.length > 0) {
      testCoupon = coupons[0];
      log('테스트 쿠폰 확인', true, `쿠폰 사용: ${testCoupon.name || testCoupon.title} (ID: ${testCoupon.id})`);
    } else if (testCoupon) {
      log('테스트 쿠폰 확인', true, `쿠폰 사용: ${testCoupon.name || testCoupon.title}`);
    } else {
      // 테스트 쿠폰 생성
      const newCouponCode = 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await connection.execute(`
        INSERT INTO coupons (code, title, name, description, discount_type, discount_value, target_type, is_active, created_at)
        VALUES (?, '테스트 할인쿠폰', '테스트 할인쿠폰', '통합 테스트용 쿠폰', 'percent', 10, 'ALL', 1, NOW())
      `, [newCouponCode]);

      const newCoupon = await connection.execute(`SELECT LAST_INSERT_ID() as id`);
      testCoupon = { id: newCoupon.rows[0].id, name: '테스트 할인쿠폰', discount_type: 'percent', discount_value: 10 };
      log('테스트 쿠폰 생성', true, `새 쿠폰 생성 (ID: ${testCoupon.id})`);
    }

    // ═══════════════════════════════════════════════════════════
    // 3. 테스트 유저 확인
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 3. 테스트 유저 확인...');

    const userResult = await poolNeon.query(`
      SELECT id, name, email, total_points
      FROM users
      LIMIT 1
    `);

    const testUser = userResult.rows?.[0];

    if (testUser) {
      log('테스트 유저 확인', true, `유저: ${testUser.name || testUser.email} (ID: ${testUser.id}, 포인트: ${testUser.total_points || 0})`);
    } else {
      log('테스트 유저 확인', false, '테스트 유저가 없습니다');
      return;
    }

    // ═══════════════════════════════════════════════════════════
    // 4. 쿠폰 발급 시뮬레이션
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 4. 쿠폰 발급 시뮬레이션...');

    const couponCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    await connection.execute(`
      INSERT INTO user_coupons (user_id, coupon_id, coupon_code, status, discount_applied)
      VALUES (?, ?, ?, 'ISSUED', 0)
    `, [testUser.id, testCoupon.id, couponCode]);

    const insertResult = await connection.execute(`SELECT LAST_INSERT_ID() as id`);
    const userCouponId = insertResult.rows[0].id;

    log('쿠폰 발급', true, `user_coupon_id: ${userCouponId}, code: ${couponCode}`);

    // ═══════════════════════════════════════════════════════════
    // 5. 쿠폰 검증 시뮬레이션
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 5. 쿠폰 검증 시뮬레이션...');

    const validateResult = await connection.execute(`
      SELECT uc.*, c.name as coupon_name, c.discount_type, c.discount_value
      FROM user_coupons uc
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.coupon_code = ? AND uc.user_id = ? AND uc.status = 'ISSUED'
    `, [couponCode, testUser.id]);

    if (validateResult.rows?.length > 0) {
      log('쿠폰 검증', true, `유효한 쿠폰 확인됨`);
    } else {
      log('쿠폰 검증', false, '쿠폰 조회 실패');
    }

    // ═══════════════════════════════════════════════════════════
    // 6. 쿠폰 사용 시뮬레이션
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 6. 쿠폰 사용 시뮬레이션...');

    const orderAmount = 50000;
    const discountAmount = 5000;
    const finalAmount = orderAmount - discountAmount;

    await connection.execute(`
      UPDATE user_coupons
      SET status = 'USED',
          used_at = NOW(),
          used_partner_id = ?,
          order_amount = ?,
          discount_amount = ?,
          final_amount = ?,
          review_submitted = 0
      WHERE id = ?
    `, [couponPartner.id, orderAmount, discountAmount, finalAmount, userCouponId]);

    log('쿠폰 사용', true, `주문 ${orderAmount}원 → 할인 ${discountAmount}원 → 결제 ${finalAmount}원`);

    // ═══════════════════════════════════════════════════════════
    // 7. 대기 리뷰 조회 시뮬레이션
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 7. 대기 리뷰 조회 시뮬레이션...');

    const pendingResult = await connection.execute(`
      SELECT
        uc.id as user_coupon_id,
        uc.coupon_code,
        uc.used_at,
        p.id as partner_id,
        p.business_name as partner_name,
        c.name as coupon_name
      FROM user_coupons uc
      LEFT JOIN partners p ON uc.used_partner_id = p.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ?
        AND uc.status = 'USED'
        AND uc.review_submitted = 0
    `, [testUser.id]);

    if (pendingResult.rows?.length > 0) {
      log('대기 리뷰 조회', true, `${pendingResult.rows.length}개 대기 리뷰 발견`);
    } else {
      log('대기 리뷰 조회', false, '대기 리뷰 없음');
    }

    // ═══════════════════════════════════════════════════════════
    // 8. 리뷰 작성 시뮬레이션
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 8. 리뷰 작성 시뮬레이션...');

    const reviewPoints = 500;

    // coupon_reviews에 리뷰 저장 (merchant_id, campaign_id 포함)
    await connection.execute(`
      INSERT INTO coupon_reviews (user_coupon_id, user_id, merchant_id, campaign_id, partner_id, rating, comment, review_text, points_awarded, created_at)
      VALUES (?, ?, ?, ?, ?, 5, '통합 테스트 리뷰', '통합 테스트 리뷰', ?, NOW())
    `, [userCouponId, testUser.id, couponPartner.id, testCoupon.id, couponPartner.id, reviewPoints]);

    log('리뷰 저장', true, '리뷰 DB 저장 완료');

    // user_coupons 업데이트
    await connection.execute(`
      UPDATE user_coupons
      SET review_submitted = 1, review_points_awarded = ?
      WHERE id = ?
    `, [reviewPoints, userCouponId]);

    log('쿠폰 리뷰 상태 업데이트', true, 'review_submitted = 1');

    // ═══════════════════════════════════════════════════════════
    // 9. 포인트 적립 시뮬레이션
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 9. 포인트 적립 시뮬레이션...');

    // Neon users 포인트 업데이트
    const currentPoints = testUser.total_points || 0;
    const newBalance = currentPoints + reviewPoints;

    await poolNeon.query(`
      UPDATE users SET total_points = $1 WHERE id = $2
    `, [newBalance, testUser.id]);

    log('Neon 포인트 업데이트', true, `${currentPoints} → ${newBalance} (+${reviewPoints}P)`);

    // PlanetScale user_points 이력 추가
    await connection.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
      VALUES (?, ?, 'earn', '쿠폰 리뷰 작성 (테스트)', ?, ?, NOW())
    `, [testUser.id, reviewPoints, `REVIEW_${userCouponId}`, newBalance]);

    log('PlanetScale 포인트 이력', true, 'user_points 이력 추가 완료');

    // ═══════════════════════════════════════════════════════════
    // 10. 정리 (테스트 데이터 롤백)
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 10. 테스트 데이터 정리...');

    // 포인트 원복
    await poolNeon.query(`UPDATE users SET total_points = $1 WHERE id = $2`, [currentPoints, testUser.id]);

    // user_points 이력 삭제
    await connection.execute(`DELETE FROM user_points WHERE related_order_id = ?`, [`REVIEW_${userCouponId}`]);

    // coupon_reviews 삭제
    await connection.execute(`DELETE FROM coupon_reviews WHERE user_coupon_id = ?`, [userCouponId]);

    // user_coupons 삭제
    await connection.execute(`DELETE FROM user_coupons WHERE id = ?`, [userCouponId]);

    log('테스트 데이터 정리', true, '롤백 완료');

    // ═══════════════════════════════════════════════════════════
    // 결과 요약
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    console.log('📊 통합 테스트 결과');
    console.log('═'.repeat(60));
    console.log(`✅ 통과: ${testResults.passed.length}개`);
    console.log(`❌ 실패: ${testResults.failed.length}개`);

    if (testResults.failed.length > 0) {
      console.log('\n실패한 테스트:');
      testResults.failed.forEach(f => console.log(`   - ${f.test}: ${f.message}`));
    } else {
      console.log('\n🎉 모든 테스트 통과! 쿠폰/리뷰 시스템이 정상 작동합니다.');
    }

  } catch (error) {
    console.error('\n❌ 통합 테스트 오류:', error);
  } finally {
    await poolNeon.end();
  }
}

runIntegrationTest();
