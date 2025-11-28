const { connect } = require('@planetscale/database');
require('dotenv').config();

async function createCoupon() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 기존 쿠폰 확인
    const existing = await connection.execute(
      'SELECT id, code FROM coupons WHERE code = ?',
      ['SHINAN2025']
    );

    if (existing.rows && existing.rows.length > 0) {
      console.log('SHINAN2025 쿠폰이 이미 존재합니다:', existing.rows[0]);
      return;
    }

    // 쿠폰 생성 (실제 DB 스키마에 맞춤)
    await connection.execute(`
      INSERT INTO coupons (
        code, name, title, description,
        discount_type, discount_value, max_discount,
        min_amount, target_type,
        valid_from, valid_until,
        usage_limit, usage_per_user,
        is_active, current_usage, used_count
      ) VALUES (
        'SHINAN2025',
        '2025 신안 섬여행 할인 쿠폰',
        '2025 신안 섬여행 할인 쿠폰',
        '신안 지역 가맹점에서 사용 가능한 15% 할인 쿠폰입니다.',
        'percentage',
        15,
        10000,
        0,
        'ALL',
        NOW(),
        DATE_ADD(NOW(), INTERVAL 1 YEAR),
        1000,
        1,
        1,
        0,
        0
      )
    `);

    console.log('SHINAN2025 쿠폰이 생성되었습니다!');
    console.log('   - 할인: 15% (최대 10,000원)');
    console.log('   - 대상: 전체 가맹점');
    console.log('   - 유효기간: 1년');

  } catch (error) {
    console.error('오류:', error.message);
  }
}

createCoupon();
