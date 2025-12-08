const { connect } = require('@planetscale/database');
require('dotenv').config();

async function testFullCouponFlow() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('        쿠폰 시스템 전체 흐름 + 시나리오 테스트');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testUserId = 1; // 테스트 사용자 ID
  const testPartnerId = 209; // 테스트 파트너 ID

  // ============================================================
  // STEP 1: 테스트 쿠폰 생성
  // ============================================================
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: 테스트 쿠폰 생성                                    │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // 기존 테스트 데이터 정리
  await conn.execute(`DELETE FROM user_coupons WHERE coupon_code LIKE 'TESTFLOW-%'`);
  await conn.execute(`DELETE FROM coupon_usage WHERE order_id LIKE 'TESTFLOW-%'`);
  await conn.execute(`DELETE FROM coupons WHERE code LIKE 'TESTFLOW-%'`);

  // 테스트 쿠폰 생성 (다양한 조건)
  const testCoupons = [
    {
      code: 'TESTFLOW-NORMAL',
      name: '일반 10% 할인',
      discount_type: 'percentage',
      discount_value: 10,
      min_amount: 10000,
      max_discount: 5000,
      usage_limit: 100,
      days_valid: 30
    },
    {
      code: 'TESTFLOW-EXPIRED',
      name: '만료된 쿠폰',
      discount_type: 'fixed',
      discount_value: 3000,
      min_amount: 5000,
      max_discount: 3000,
      usage_limit: 100,
      days_valid: -1  // 어제 만료
    },
    {
      code: 'TESTFLOW-MINAMT',
      name: '최소금액 5만원',
      discount_type: 'percentage',
      discount_value: 20,
      min_amount: 50000,
      max_discount: 10000,
      usage_limit: 100,
      days_valid: 30
    },
    {
      code: 'TESTFLOW-LIMIT1',
      name: '총 1회만 사용',
      discount_type: 'fixed',
      discount_value: 5000,
      min_amount: 0,
      max_discount: 5000,
      usage_limit: 1,
      days_valid: 30
    },
    {
      code: 'TESTFLOW-INACTIVE',
      name: '비활성 쿠폰',
      discount_type: 'percentage',
      discount_value: 50,
      min_amount: 0,
      max_discount: 50000,
      usage_limit: 100,
      days_valid: 30,
      is_active: false
    }
  ];

  for (const c of testCoupons) {
    const validUntil = c.days_valid >= 0
      ? `DATE_ADD(NOW(), INTERVAL ${c.days_valid} DAY)`
      : `DATE_SUB(NOW(), INTERVAL 1 DAY)`;

    await conn.execute(`
      INSERT INTO coupons (
        code, name, title, description,
        discount_type, discount_value, min_amount, max_discount, max_discount_amount,
        coupon_category, target_type,
        valid_from, valid_until, usage_limit, usage_per_user, max_issues_per_user,
        is_active, current_usage, used_count, issued_count
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'product', 'ALL',
        NOW(), ${validUntil}, ?, 1, 1,
        ?, 0, 0, 0
      )
    `, [
      c.code, c.name, c.name, c.name,
      c.discount_type, c.discount_value, c.min_amount, c.max_discount, c.max_discount,
      c.usage_limit,
      c.is_active !== false ? 1 : 0
    ]);
    console.log(`   ✅ 생성: ${c.code} (${c.name})`);
  }
  console.log('');

  // ============================================================
  // STEP 2: 쿠폰 발급 테스트
  // ============================================================
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: 쿠폰 발급 테스트 (user_coupons)                     │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // user_coupons 테이블 존재 확인
  try {
    await conn.execute(`SELECT 1 FROM user_coupons LIMIT 1`);
  } catch (e) {
    console.log('   ⚠️ user_coupons 테이블이 없어서 생성합니다...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS user_coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        coupon_id INT NOT NULL,
        coupon_code VARCHAR(50) NOT NULL,
        status ENUM('ISSUED', 'USED', 'EXPIRED') DEFAULT 'ISSUED',
        used_at DATETIME,
        used_partner_id INT,
        order_amount DECIMAL(10,2),
        discount_amount DECIMAL(10,2),
        final_amount DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_coupon (coupon_id),
        INDEX idx_code (coupon_code),
        INDEX idx_status (status)
      )
    `);
    console.log('   ✅ user_coupons 테이블 생성 완료\n');
  }

  // 쿠폰 발급
  const couponsToIssue = await conn.execute(`
    SELECT id, code FROM coupons WHERE code LIKE 'TESTFLOW-%'
  `);

  for (const c of couponsToIssue.rows) {
    const userCouponCode = `${c.code}-U${testUserId}`;
    await conn.execute(`
      INSERT INTO user_coupons (user_id, coupon_id, coupon_code, status)
      VALUES (?, ?, ?, 'ISSUED')
    `, [testUserId, c.id, userCouponCode]);
    console.log(`   ✅ 발급: ${userCouponCode} → 사용자 ${testUserId}`);
  }
  console.log('');

  // ============================================================
  // STEP 3: 시나리오별 테스트
  // ============================================================
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 3: 시나리오별 테스트                                   │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const scenarios = [
    {
      name: '✅ 정상 사용',
      coupon_code: 'TESTFLOW-NORMAL',
      order_amount: 30000,
      expected: 'SUCCESS',
      expected_discount: 3000  // 30000 * 10% = 3000
    },
    {
      name: '❌ 만료된 쿠폰 사용',
      coupon_code: 'TESTFLOW-EXPIRED',
      order_amount: 20000,
      expected: 'EXPIRED'
    },
    {
      name: '❌ 최소금액 미달',
      coupon_code: 'TESTFLOW-MINAMT',
      order_amount: 30000,  // 최소 50000원
      expected: 'MIN_AMOUNT_NOT_MET'
    },
    {
      name: '❌ 비활성 쿠폰',
      coupon_code: 'TESTFLOW-INACTIVE',
      order_amount: 50000,
      expected: 'INACTIVE'
    },
    {
      name: '✅ 최소금액 충족',
      coupon_code: 'TESTFLOW-MINAMT',
      order_amount: 60000,  // 50000원 이상
      expected: 'SUCCESS',
      expected_discount: 10000  // 60000 * 20% = 12000, max 10000
    },
    {
      name: '❌ 이미 사용한 쿠폰 재사용',
      coupon_code: 'TESTFLOW-NORMAL',  // 첫 번째 시나리오에서 사용됨
      order_amount: 25000,
      expected: 'ALREADY_USED'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    console.log(`   [시나리오 ${i + 1}] ${s.name}`);
    console.log(`      쿠폰: ${s.coupon_code}, 주문금액: ${s.order_amount.toLocaleString()}원`);

    try {
      const result = await simulateCouponUse(conn, s.coupon_code, testUserId, s.order_amount, testPartnerId);

      if (result.status === s.expected) {
        console.log(`      ✅ 예상대로 작동: ${result.status}`);
        if (result.discount_amount) {
          console.log(`      💰 할인금액: ${result.discount_amount.toLocaleString()}원`);
          if (s.expected_discount && result.discount_amount !== s.expected_discount) {
            console.log(`      ⚠️ 할인금액 불일치! 예상: ${s.expected_discount}, 실제: ${result.discount_amount}`);
          }
        }
        passed++;
      } else {
        console.log(`      ❌ 예상과 다름: 예상=${s.expected}, 실제=${result.status}`);
        if (result.message) console.log(`      메시지: ${result.message}`);
        failed++;
      }
    } catch (err) {
      console.log(`      ❌ 에러 발생: ${err.message}`);
      failed++;
    }
    console.log('');
  }

  // ============================================================
  // STEP 4: 사용 제한 테스트
  // ============================================================
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 4: 사용 제한 테스트                                    │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // TESTFLOW-LIMIT1 쿠폰: 총 1회만 사용 가능
  console.log('   [테스트] 총 사용 횟수 제한 (1회)');

  // 첫 번째 사용
  const limit1Result1 = await simulateCouponUse(conn, 'TESTFLOW-LIMIT1', testUserId, 20000, testPartnerId);
  console.log(`      1회차 사용: ${limit1Result1.status}`);

  if (limit1Result1.status === 'SUCCESS') {
    passed++;
    // 다른 사용자가 같은 쿠폰 사용 시도 (총 사용 횟수 초과)
    const otherUserId = 2;

    // 다른 사용자에게 쿠폰 발급
    const couponInfo = await conn.execute(`SELECT id FROM coupons WHERE code = 'TESTFLOW-LIMIT1'`);
    await conn.execute(`
      INSERT INTO user_coupons (user_id, coupon_id, coupon_code, status)
      VALUES (?, ?, 'TESTFLOW-LIMIT1-U2', 'ISSUED')
    `, [otherUserId, couponInfo.rows[0].id]);

    const limit1Result2 = await simulateCouponUse(conn, 'TESTFLOW-LIMIT1', otherUserId, 20000, testPartnerId);
    console.log(`      2회차 사용 (다른 사용자): ${limit1Result2.status}`);

    if (limit1Result2.status === 'USAGE_LIMIT_EXCEEDED') {
      console.log('      ✅ 총 사용 횟수 제한 정상 작동');
      passed++;
    } else {
      console.log('      ❌ 총 사용 횟수 제한 미작동');
      failed++;
    }
  } else {
    console.log('      ❌ 첫 번째 사용 실패');
    failed++;
  }
  console.log('');

  // ============================================================
  // STEP 5: 결과 요약
  // ============================================================
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 5: 결과 요약                                           │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // 사용 내역 확인
  const usageResult = await conn.execute(`
    SELECT uc.*, c.code as coupon_code, c.name as coupon_name
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.coupon_code LIKE 'TESTFLOW-%'
    ORDER BY uc.id
  `);

  console.log('   📋 쿠폰 상태 현황:');
  console.log('   ┌──────────────────────────────┬──────────┬────────────┐');
  console.log('   │ 쿠폰 코드                    │ 상태     │ 할인금액   │');
  console.log('   ├──────────────────────────────┼──────────┼────────────┤');
  for (const u of usageResult.rows) {
    const status = u.status.padEnd(8);
    const discount = u.discount_amount ? `${Number(u.discount_amount).toLocaleString()}원` : '-';
    console.log(`   │ ${u.coupon_code.padEnd(28)} │ ${status} │ ${discount.padStart(10)} │`);
  }
  console.log('   └──────────────────────────────┴──────────┴────────────┘\n');

  // 테스트 결과
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   테스트 결과: ${passed}개 통과 / ${failed}개 실패`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ============================================================
  // STEP 6: 부족한 점 분석
  // ============================================================
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 6: 부족한 점 및 개선 제안                              │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const issues = [];

  // 1. user_coupons 테이블 체크
  const userCouponsCheck = await conn.execute(`SHOW COLUMNS FROM user_coupons`);
  const columns = userCouponsCheck.rows.map(r => r.Field);

  if (!columns.includes('expires_at')) {
    issues.push({
      severity: '⚠️ 중요',
      issue: 'user_coupons에 expires_at 컬럼 없음',
      impact: '사용자별 쿠폰 만료일 관리 불가',
      solution: 'ALTER TABLE user_coupons ADD COLUMN expires_at DATETIME'
    });
  }

  // 2. 쿠폰북 발급 API 체크
  try {
    const claimApi = require('../api/coupon/claim.js');
    console.log('   ✅ 쿠폰북 발급 API 존재');
  } catch (e) {
    issues.push({
      severity: '⚠️ 중요',
      issue: '쿠폰북 발급 API 누락 또는 오류',
      impact: '쿠폰북에서 쿠폰 받기 불가',
      solution: 'api/coupon/claim.js 확인 필요'
    });
  }

  // 3. 신규 회원 자동 발급 체크
  issues.push({
    severity: 'ℹ️ 참고',
    issue: '신규 회원 쿠폰 자동 발급 로직 미확인',
    impact: 'member_target=new 쿠폰이 회원가입 시 자동 발급되지 않을 수 있음',
    solution: '회원가입 API에서 쿠폰 자동 발급 로직 추가 필요'
  });

  // 4. 쿠폰 사용 알림 체크
  issues.push({
    severity: 'ℹ️ 참고',
    issue: '쿠폰 사용 알림 기능 없음',
    impact: '사용자가 쿠폰 사용 여부를 실시간으로 알 수 없음',
    solution: '쿠폰 사용 시 푸시/SMS 알림 기능 추가'
  });

  // 5. 중복 발급 방지 체크
  const dupCheck = await conn.execute(`
    SELECT COUNT(*) as cnt FROM user_coupons
    WHERE user_id = ? AND coupon_id IN (SELECT id FROM coupons WHERE code = 'TESTFLOW-NORMAL')
  `, [testUserId]);

  if (dupCheck.rows[0].cnt > 1) {
    issues.push({
      severity: '🚨 심각',
      issue: '중복 발급 방지 로직 미작동',
      impact: '같은 쿠폰이 같은 사용자에게 여러 번 발급될 수 있음',
      solution: 'UNIQUE INDEX(user_id, coupon_id) 추가 또는 발급 전 체크 로직 강화'
    });
  }

  // 결과 출력
  if (issues.length > 0) {
    console.log('   발견된 이슈:');
    issues.forEach((issue, idx) => {
      console.log(`\n   ${idx + 1}. ${issue.severity} ${issue.issue}`);
      console.log(`      영향: ${issue.impact}`);
      console.log(`      해결: ${issue.solution}`);
    });
  } else {
    console.log('   ✅ 특별한 이슈 없음');
  }

  console.log('\n');

  // 정리
  console.log('   🧹 테스트 데이터 정리 중...');
  await conn.execute(`DELETE FROM user_coupons WHERE coupon_code LIKE 'TESTFLOW-%'`);
  await conn.execute(`DELETE FROM coupon_usage WHERE order_id LIKE 'TESTFLOW-%'`);
  await conn.execute(`DELETE FROM coupons WHERE code LIKE 'TESTFLOW-%'`);
  console.log('   ✅ 정리 완료\n');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('             쿠폰 시스템 전체 테스트 완료');
  console.log('═══════════════════════════════════════════════════════════════');
}

/**
 * 쿠폰 사용 시뮬레이션
 */
async function simulateCouponUse(conn, couponCode, userId, orderAmount, partnerId) {
  // 1. 쿠폰 정보 조회
  const couponResult = await conn.execute(`
    SELECT * FROM coupons WHERE code = ?
  `, [couponCode]);

  if (!couponResult.rows || couponResult.rows.length === 0) {
    return { status: 'NOT_FOUND', message: '쿠폰을 찾을 수 없습니다' };
  }

  const coupon = couponResult.rows[0];

  // 2. 활성 상태 확인
  if (!coupon.is_active) {
    return { status: 'INACTIVE', message: '비활성 쿠폰입니다' };
  }

  // 3. 유효기간 확인
  if (coupon.valid_until) {
    const now = new Date();
    const validUntil = new Date(coupon.valid_until);
    if (now > validUntil) {
      return { status: 'EXPIRED', message: '만료된 쿠폰입니다' };
    }
  }

  // 4. 총 사용 횟수 확인
  if (coupon.usage_limit && coupon.current_usage >= coupon.usage_limit) {
    return { status: 'USAGE_LIMIT_EXCEEDED', message: '쿠폰 사용 횟수가 초과되었습니다' };
  }

  // 5. 사용자 쿠폰 상태 확인
  const userCouponResult = await conn.execute(`
    SELECT * FROM user_coupons
    WHERE user_id = ? AND coupon_id = ?
    ORDER BY id DESC LIMIT 1
  `, [userId, coupon.id]);

  if (!userCouponResult.rows || userCouponResult.rows.length === 0) {
    return { status: 'NOT_ISSUED', message: '발급받지 않은 쿠폰입니다' };
  }

  const userCoupon = userCouponResult.rows[0];

  if (userCoupon.status === 'USED') {
    return { status: 'ALREADY_USED', message: '이미 사용한 쿠폰입니다' };
  }

  if (userCoupon.status === 'EXPIRED') {
    return { status: 'EXPIRED', message: '만료된 쿠폰입니다' };
  }

  // 6. 최소 주문금액 확인
  if (coupon.min_amount && orderAmount < coupon.min_amount) {
    return {
      status: 'MIN_AMOUNT_NOT_MET',
      message: `최소 주문금액 ${coupon.min_amount.toLocaleString()}원 이상이어야 합니다`
    };
  }

  // 7. 할인금액 계산
  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = Math.floor(orderAmount * (coupon.discount_value / 100));
    if (coupon.max_discount && discountAmount > coupon.max_discount) {
      discountAmount = coupon.max_discount;
    }
  } else {
    discountAmount = coupon.discount_value;
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }
  }

  const finalAmount = orderAmount - discountAmount;

  // 8. 사용 처리
  await conn.execute(`
    UPDATE user_coupons
    SET status = 'USED', used_at = NOW(), used_partner_id = ?,
        order_amount = ?, discount_amount = ?, final_amount = ?
    WHERE id = ?
  `, [partnerId, orderAmount, discountAmount, finalAmount, userCoupon.id]);

  // 9. 쿠폰 사용 카운트 증가
  await conn.execute(`
    UPDATE coupons SET current_usage = current_usage + 1, used_count = used_count + 1
    WHERE id = ?
  `, [coupon.id]);

  // 10. coupon_usage 기록
  await conn.execute(`
    INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount, used_at)
    VALUES (?, ?, ?, ?, NOW())
  `, [coupon.id, userId, `TESTFLOW-ORDER-${Date.now()}`, discountAmount]);

  return {
    status: 'SUCCESS',
    discount_amount: discountAmount,
    final_amount: finalAmount,
    message: '쿠폰이 사용되었습니다'
  };
}

testFullCouponFlow().catch(console.error);
