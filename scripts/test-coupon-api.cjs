/**
 * 쿠폰 API 테스트
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function test() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('  쿠폰 API 테스트');
  console.log('========================================\n');

  // 1. 쿠폰 조회 (AdminCoupons API와 동일한 쿼리)
  console.log('=== 1. 쿠폰 목록 조회 ===');
  const coupons = await conn.execute(`
    SELECT
      id, code, name, title,
      discount_type, discount_value, min_amount,
      max_discount, max_discount_amount,
      target_type, is_active,
      usage_limit, current_usage
    FROM coupons
    ORDER BY created_at DESC
  `);

  console.log(`총 ${coupons.rows.length}개 쿠폰\n`);
  coupons.rows.forEach(c => {
    const discountText = c.discount_type === 'percentage'
      ? `${c.discount_value}%`
      : `${c.discount_value}원`;
    console.log(`[${c.id}] ${c.code} - ${c.name || c.title || '-'}`);
    console.log(`    할인: ${discountText} | 활성: ${c.is_active ? 'ON' : 'OFF'} | 발급: ${c.current_usage || 0}/${c.usage_limit || '무제한'}`);
  });

  // 2. 쿠폰 통계용 쿼리 테스트
  console.log('\n=== 2. 쿠폰 통계 쿼리 테스트 ===');
  try {
    const stats = await conn.execute(`
      SELECT
        c.id, c.code, c.name,
        c.discount_type, c.discount_value, c.is_active,
        COUNT(uc.id) as issued_count,
        SUM(CASE WHEN uc.status = 'USED' THEN 1 ELSE 0 END) as used_count
      FROM coupons c
      LEFT JOIN user_coupons uc ON c.id = uc.coupon_id
      GROUP BY c.id, c.code, c.name, c.discount_type, c.discount_value, c.is_active
      ORDER BY used_count DESC
      LIMIT 5
    `);
    console.log('✅ 쿠폰 통계 쿼리 성공');
    stats.rows.forEach(s => {
      console.log(`  ${s.code}: 발급 ${s.issued_count}건, 사용 ${s.used_count}건`);
    });
  } catch (e) {
    console.log('❌ 쿠폰 통계 쿼리 오류:', e.message);
  }

  // 3. user_coupons 테이블 상태
  console.log('\n=== 3. user_coupons 상태 ===');
  const userCoupons = await conn.execute(`
    SELECT status, COUNT(*) as cnt FROM user_coupons GROUP BY status
  `);
  userCoupons.rows.forEach(uc => {
    console.log(`  ${uc.status}: ${uc.cnt}건`);
  });

  console.log('\n✅ 테스트 완료');
}

test().catch(console.error);
