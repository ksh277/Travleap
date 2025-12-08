const { connect } = require('@planetscale/database');
require('dotenv').config();

async function testCouponSystem() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('   쿠폰 시스템 테스트 시작');
  console.log('========================================\n');

  // 1. 기존 테스트 쿠폰 삭제
  console.log('1️⃣ 기존 테스트 쿠폰 정리...');
  await conn.execute(`DELETE FROM coupons WHERE code LIKE 'TEST-%'`);
  console.log('   ✅ 기존 테스트 쿠폰 삭제 완료\n');

  // 2. 3가지 유형 쿠폰 생성
  console.log('2️⃣ 3가지 유형 쿠폰 생성...\n');

  // 유형 1: 결제 상품 쿠폰 (product)
  console.log('   [유형 1] 결제 상품 쿠폰 생성...');
  await conn.execute(`
    INSERT INTO coupons (
      code, name, title, description,
      discount_type, discount_value, min_amount, max_discount, max_discount_amount,
      coupon_category, member_target, target_type,
      valid_from, valid_until, usage_limit, usage_per_user, max_issues_per_user,
      is_active, current_usage, used_count, issued_count
    ) VALUES (
      'TEST-PRODUCT-10', '테스트 상품 쿠폰', '10% 할인 쿠폰', '상품 결제 시 10% 할인',
      'percentage', 10, 10000, 5000, 5000,
      'product', 'all', 'ALL',
      NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 100, 1, 1,
      1, 0, 0, 0
    )
  `);
  console.log('   ✅ 결제 상품 쿠폰 생성 완료 (TEST-PRODUCT-10)\n');

  // 유형 2: 회원별 쿠폰 (member) - 신규 회원용
  console.log('   [유형 2] 회원별 쿠폰 (신규 회원) 생성...');
  await conn.execute(`
    INSERT INTO coupons (
      code, name, title, description,
      discount_type, discount_value, min_amount, max_discount, max_discount_amount,
      coupon_category, member_target, target_type,
      valid_from, valid_until, usage_limit, usage_per_user, max_issues_per_user,
      is_active, current_usage, used_count, issued_count
    ) VALUES (
      'TEST-NEWMEMBER-5000', '신규 회원 환영 쿠폰', '5,000원 할인', '신규 가입 회원 전용 쿠폰',
      'fixed', 5000, 20000, 5000, 5000,
      'member', 'new', 'ALL',
      NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NULL, 1, 1,
      1, 0, 0, 0
    )
  `);
  console.log('   ✅ 신규 회원 쿠폰 생성 완료 (TEST-NEWMEMBER-5000)\n');

  // 유형 3: 쿠폰북 쿠폰 (couponbook)
  console.log('   [유형 3] 쿠폰북 쿠폰 생성...');
  await conn.execute(`
    INSERT INTO coupons (
      code, name, title, description,
      discount_type, discount_value, min_amount, max_discount, max_discount_amount,
      coupon_category, member_target, target_type,
      valid_from, valid_until, usage_limit, usage_per_user, max_issues_per_user,
      is_active, current_usage, used_count, issued_count
    ) VALUES (
      'TEST-COUPONBOOK-15', '쿠폰북 전용 쿠폰', '15% 할인', '쿠폰북에서 받을 수 있는 특별 쿠폰',
      'percentage', 15, 15000, 10000, 10000,
      'couponbook', 'all', 'ALL',
      NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 50, 1, 1,
      1, 0, 0, 0
    )
  `);
  console.log('   ✅ 쿠폰북 쿠폰 생성 완료 (TEST-COUPONBOOK-15)\n');

  // 3. 생성된 쿠폰 확인
  console.log('3️⃣ 생성된 쿠폰 확인...\n');
  const result = await conn.execute(`
    SELECT id, code, name, discount_type, discount_value, coupon_category, member_target, is_active
    FROM coupons
    WHERE code LIKE 'TEST-%'
    ORDER BY id
  `);

  console.log('   ┌────────────────────────────────────────────────────────────────────┐');
  console.log('   │ 코드                  │ 이름              │ 할인     │ 유형      │');
  console.log('   ├────────────────────────────────────────────────────────────────────┤');
  result.rows.forEach(c => {
    const discount = c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value}원`;
    const categoryLabel = {
      'product': '🛒 결제상품',
      'member': '👥 회원별',
      'couponbook': '📖 쿠폰북'
    }[c.coupon_category] || '기타';
    console.log(`   │ ${c.code.padEnd(20)} │ ${c.name.substring(0, 12).padEnd(12)} │ ${discount.padEnd(8)} │ ${categoryLabel.padEnd(10)} │`);
  });
  console.log('   └────────────────────────────────────────────────────────────────────┘\n');

  // 4. 쿠폰 사용 시뮬레이션
  console.log('4️⃣ 쿠폰 사용 시뮬레이션...\n');

  // 첫 번째 쿠폰 사용 기록
  const testCoupon = result.rows[0];
  console.log(`   쿠폰 "${testCoupon.code}" 사용 테스트...`);

  // coupon_usage 테이블에 테스트 데이터 삽입
  await conn.execute(`
    INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount, used_at)
    VALUES (?, 1, 'TEST-ORDER-001', 1500, NOW())
  `, [testCoupon.id]);

  // 쿠폰 사용 카운트 증가
  await conn.execute(`
    UPDATE coupons SET used_count = used_count + 1, current_usage = current_usage + 1
    WHERE id = ?
  `, [testCoupon.id]);

  console.log('   ✅ 쿠폰 사용 기록 완료\n');

  // 5. 쿠폰 사용 내역 확인
  console.log('5️⃣ 쿠폰 사용 내역 확인...\n');
  const usageResult = await conn.execute(`
    SELECT cu.*, c.code, c.name
    FROM coupon_usage cu
    JOIN coupons c ON cu.coupon_id = c.id
    WHERE cu.order_id LIKE 'TEST-%'
  `);

  if (usageResult.rows.length > 0) {
    usageResult.rows.forEach(u => {
      console.log(`   📋 주문번호: ${u.order_id}`);
      console.log(`      쿠폰: ${u.code} (${u.name})`);
      console.log(`      할인액: ${u.discount_amount}원`);
      console.log(`      사용일시: ${u.used_at}\n`);
    });
  }

  // 6. 정리
  console.log('6️⃣ 테스트 데이터 정리...');
  await conn.execute(`DELETE FROM coupon_usage WHERE order_id LIKE 'TEST-%'`);
  // 테스트 쿠폰은 남겨둠 (확인용)
  console.log('   ✅ 테스트 사용 내역 삭제 완료');
  console.log('   ℹ️  테스트 쿠폰은 관리자 페이지에서 확인 가능\n');

  console.log('========================================');
  console.log('   쿠폰 시스템 테스트 완료 ✅');
  console.log('========================================');
}

testCouponSystem().catch(console.error);
