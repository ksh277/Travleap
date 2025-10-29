const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkCoupons() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute(`
      SELECT code, title, discount_type, discount_value, min_amount,
             is_active, valid_from, valid_until, usage_limit, current_usage
      FROM coupons
      WHERE code IN ('TRAVLEAP1000', 'WELCOME20', 'VIP5000')
    `);

    console.log('📋 쿠폰 현황:\n');

    if (!result.rows || result.rows.length === 0) {
      console.log('❌ 쿠폰이 존재하지 않습니다!');
      return;
    }

    result.rows.forEach(coupon => {
      const discountText = coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value}원`;

      console.log(`🎟️ ${coupon.code}`);
      console.log(`   제목: ${coupon.title}`);
      console.log(`   타입: ${coupon.discount_type}`);
      console.log(`   할인: ${discountText}`);
      console.log(`   최소주문: ${coupon.min_amount ? coupon.min_amount.toLocaleString() : 0}원`);
      console.log(`   활성화: ${coupon.is_active ? '✅' : '❌'}`);
      console.log(`   유효기간: ${coupon.valid_from} ~ ${coupon.valid_until}`);
      console.log(`   사용현황: ${coupon.current_usage || 0}/${coupon.usage_limit || '무제한'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 쿠폰 조회 실패:', error);
  }
}

checkCoupons();
