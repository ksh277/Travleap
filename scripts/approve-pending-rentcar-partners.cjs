const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('✅ pending 상태의 렌트카 업체를 approved로 변경\n');

  // pending 렌트카 업체 조회
  const pending = await db.execute(`
    SELECT id, business_name, status
    FROM partners
    WHERE partner_type = 'rentcar' AND status = 'pending'
  `);

  console.log(`총 ${pending.rows?.length || 0}개 pending 업체:\n`);

  for (const p of pending.rows || []) {
    console.log(`- ${p.business_name} (partner_id=${p.id})`);
  }

  if (!pending.rows || pending.rows.length === 0) {
    console.log('승인 대기 중인 업체가 없습니다.');
    process.exit(0);
  }

  console.log('\n승인 처리 중...\n');

  // status를 approved로 변경
  await db.execute(`
    UPDATE partners
    SET status = 'approved'
    WHERE partner_type = 'rentcar' AND status = 'pending'
  `);

  console.log('✅ 모든 pending 업체가 approved로 변경되었습니다!');

  // 마이그레이션 스크립트 다시 실행
  console.log('\n🔄 rentcar_vendors 테이블로 마이그레이션 중...\n');

  const approved = await db.execute(`
    SELECT id, business_name, contact_name, email, phone, business_address, description, images
    FROM partners
    WHERE partner_type = 'rentcar' AND status = 'approved'
  `);

  for (const p of approved.rows || []) {
    // 이미 존재하는지 확인
    const existing = await db.execute(`
      SELECT id FROM rentcar_vendors WHERE business_name = ?
    `, [p.business_name]);

    if (existing.rows && existing.rows.length > 0) {
      console.log(`  ⏭️  ${p.business_name} - 이미 존재함`);
      continue;
    }

    const vendorCode = `TRAVLEAP_RC_${String(p.id).padStart(3, '0')}`;

    await db.execute(`
      INSERT INTO rentcar_vendors (
        vendor_code, business_name, brand_name, contact_name, contact_email, contact_phone,
        description, address, images, status, is_verified, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      vendorCode,
      p.business_name,
      p.business_name,
      p.contact_name || p.business_name,
      p.email,
      p.phone,
      p.description || '',
      p.business_address || '',
      p.images || '[]',
      'active',
      1, // is_verified = true
      null
    ]);

    console.log(`  ✅ ${p.business_name} - 추가 완료`);
  }

  // 최종 확인
  const final = await db.execute(`
    SELECT business_name FROM rentcar_vendors WHERE status = 'active' ORDER BY created_at DESC
  `);

  console.log(`\n✅ 완료! 현재 활성 렌트카 업체: ${final.rows?.length || 0}개\n`);
  for (const v of final.rows || []) {
    console.log(`  - ${v.business_name}`);
  }

  process.exit(0);
})();
