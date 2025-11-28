/**
 * 테스트용 파트너 쿠폰 기능 활성화 스크립트
 * 승인된 파트너들의 is_coupon_partner를 활성화
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function main() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 현재 파트너 상태 확인 중...\n');

  // 1. 현재 파트너 목록 조회
  const partnersResult = await connection.execute(`
    SELECT id, business_name, services, user_id, is_coupon_partner, status
    FROM partners
    WHERE status = 'approved'
    ORDER BY id
  `);

  const partners = partnersResult.rows || [];

  if (partners.length === 0) {
    console.log('❌ 승인된 파트너가 없습니다.');
    return;
  }

  console.log(`📋 승인된 파트너 ${partners.length}개:\n`);
  console.log('ID\t쿠폰파트너\t카테고리\t\t업체명');
  console.log('-'.repeat(60));

  partners.forEach(p => {
    const couponStatus = p.is_coupon_partner ? '✅ ON' : '❌ OFF';
    console.log(`${p.id}\t${couponStatus}\t\t${(p.services || '-').padEnd(12)}\t${p.business_name}`);
  });

  // 2. 쿠폰 파트너가 아닌 것들 활성화
  const inactivePartners = partners.filter(p => !p.is_coupon_partner);

  if (inactivePartners.length === 0) {
    console.log('\n✅ 모든 파트너가 이미 쿠폰 기능 활성화되어 있습니다.');
    return;
  }

  console.log(`\n🔧 ${inactivePartners.length}개 파트너 쿠폰 기능 활성화 중...\n`);

  // 3. is_coupon_partner = 1로 업데이트 + 기본 할인 설정
  for (const partner of inactivePartners) {
    await connection.execute(`
      UPDATE partners
      SET
        is_coupon_partner = 1,
        coupon_discount_type = COALESCE(coupon_discount_type, 'PERCENT'),
        coupon_discount_value = COALESCE(coupon_discount_value, 10),
        coupon_max_discount = COALESCE(coupon_max_discount, 10000),
        coupon_min_order = COALESCE(coupon_min_order, 10000)
      WHERE id = ?
    `, [partner.id]);

    console.log(`  ✅ ${partner.business_name} (ID: ${partner.id}) - 쿠폰 활성화 완료`);
  }

  // 4. 결과 확인
  console.log('\n📊 업데이트 후 상태:\n');

  const afterResult = await connection.execute(`
    SELECT id, business_name, is_coupon_partner, coupon_discount_type, coupon_discount_value
    FROM partners
    WHERE status = 'approved'
    ORDER BY id
  `);

  console.log('ID\t쿠폰파트너\t할인타입\t할인값\t\t업체명');
  console.log('-'.repeat(70));

  (afterResult.rows || []).forEach(p => {
    const couponStatus = p.is_coupon_partner ? '✅ ON' : '❌ OFF';
    const discountType = p.coupon_discount_type || '-';
    const discountValue = p.coupon_discount_value || 0;
    console.log(`${p.id}\t${couponStatus}\t\t${discountType}\t\t${discountValue}%\t\t${p.business_name}`);
  });

  console.log('\n✅ 완료! 이제 파트너 대시보드에서 쿠폰 사용 처리가 가능합니다.');
}

main().catch(console.error);
