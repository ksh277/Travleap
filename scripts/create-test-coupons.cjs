const { connect } = require('@planetscale/database');
require('dotenv').config();

async function createTestCoupons() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🎟️ 테스트 쿠폰 생성 시작...\n');

  try {
    // 기존 테스트 쿠폰 삭제
    await connection.execute(`
      DELETE FROM coupons
      WHERE code IN ('TRAVLEAP1000', 'WELCOME20', 'VIP5000')
    `);
    console.log('✅ 기존 테스트 쿠폰 삭제 완료\n');

    // 테스트 쿠폰 3개 생성
    const coupons = [
      {
        code: 'TRAVLEAP1000',
        title: '트래블립 1000원 할인',
        type: 'fixed',
        value: 1000,
        minAmount: 5000,
        description: '1,000원 할인 쿠폰 (최소 주문 5,000원)'
      },
      {
        code: 'WELCOME20',
        title: '웰컴 20% 할인',
        type: 'percentage',
        value: 20,
        minAmount: 10000,
        description: '20% 할인 쿠폰 (최소 주문 10,000원)'
      },
      {
        code: 'VIP5000',
        title: 'VIP 5000원 할인',
        type: 'fixed',
        value: 5000,
        minAmount: 20000,
        description: 'VIP 5,000원 할인 쿠폰 (최소 주문 20,000원)'
      }
    ];

    for (const coupon of coupons) {
      const typeText = coupon.type === 'fixed' ? '정액 할인' : '정률 할인';
      const discountText = coupon.type === 'fixed' ? coupon.value.toLocaleString() + '원' : coupon.value + '%';

      await connection.execute(`
        INSERT INTO coupons (
          code,
          title,
          discount_type,
          discount_value,
          min_amount,
          usage_limit,
          current_usage,
          valid_from,
          valid_until,
          is_active,
          description,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1, ?, NOW())
      `, [
        coupon.code,
        coupon.title,
        coupon.type,
        coupon.value,
        coupon.minAmount,
        100, // usage_limit
        0,   // current_usage
        coupon.description
      ]);

      console.log(`✅ 쿠폰 생성 완료: ${coupon.code}`);
      console.log(`   - 타입: ${typeText}`);
      console.log(`   - 할인: ${discountText}`);
      console.log(`   - 최소 주문: ${coupon.minAmount.toLocaleString()}원`);
      console.log(`   - 유효기간: 30일`);
      console.log(`   - 최대 사용: 100회\n`);
    }

    console.log('\n🎉 모든 테스트 쿠폰이 성공적으로 생성되었습니다!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 사용 가능한 쿠폰 코드:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1️⃣  TRAVLEAP1000  - 1,000원 할인 (5,000원 이상 주문)');
    console.log('2️⃣  WELCOME20     - 20% 할인 (10,000원 이상 주문)');
    console.log('3️⃣  VIP5000       - 5,000원 할인 (20,000원 이상 주문)');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ 쿠폰 생성 실패:', error);
    process.exit(1);
  }
}

createTestCoupons();
