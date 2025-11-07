const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('🔄 partners 테이블의 렌트카 업체를 rentcar_vendors 테이블로 마이그레이션\n');

  // 1. partners 테이블에서 렌트카 업체 조회 (approved만)
  const partners = await db.execute(`
    SELECT id, business_name, contact_name, email, phone, business_address, description, images,
           status, is_verified, created_at
    FROM partners
    WHERE partner_type = 'rentcar' AND status = 'approved'
  `);

  console.log(`총 ${partners.rows?.length || 0}개 렌트카 업체 발견:\n`);

  for (const p of partners.rows || []) {
    console.log(`- ${p.business_name} (partner_id=${p.id}, status=${p.status})`);
  }

  if (!partners.rows || partners.rows.length === 0) {
    console.log('\n⚠️  마이그레이션할 업체가 없습니다.');
    process.exit(0);
  }

  console.log('\n마이그레이션 시작...\n');

  for (const p of partners.rows || []) {
    // rentcar_vendors에 이미 존재하는지 확인
    const existing = await db.execute(`
      SELECT id FROM rentcar_vendors WHERE business_name = ?
    `, [p.business_name]);

    if (existing.rows && existing.rows.length > 0) {
      console.log(`  ⏭️  ${p.business_name} - 이미 존재함 (건너뜀)`);
      continue;
    }

    // vendor_code 생성
    const vendorCode = `TRAVLEAP_RC_${String(p.id).padStart(3, '0')}`;

    // rentcar_vendors에 추가
    await db.execute(`
      INSERT INTO rentcar_vendors (
        vendor_code, business_name, brand_name, contact_name, contact_email, contact_phone,
        description, address, images, status, is_verified, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      vendorCode,
      p.business_name,
      p.business_name, // brand_name = business_name
      p.contact_name || p.business_name, // contact_name
      p.email,
      p.phone,
      p.description || '',
      p.business_address || '',
      p.images || '[]',
      'active', // status를 active로 설정
      p.is_verified ? 1 : 0,
      null // user_id
    ]);

    console.log(`  ✅ ${p.business_name} - 마이그레이션 완료 (vendor_code: ${vendorCode})`);
  }

  console.log('\n✅ 마이그레이션 완료!');

  // 최종 확인
  const finalResult = await db.execute(`
    SELECT COUNT(*) as count FROM rentcar_vendors WHERE status = 'active'
  `);

  console.log(`\n현재 활성 렌트카 업체: ${finalResult.rows[0].count}개`);

  process.exit(0);
})();
