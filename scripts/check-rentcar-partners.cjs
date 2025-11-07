const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('🚗 렌트카 업체 확인\n');

  // 렌트카 업체 조회
  const partners = await db.execute(`
    SELECT id, business_name, partner_type, status, is_verified, is_active, created_at
    FROM partners
    WHERE partner_type = 'rentcar'
    ORDER BY created_at DESC
  `);

  console.log(`총 ${partners.rows?.length || 0}개 렌트카 업체:\n`);
  for (const p of partners.rows || []) {
    console.log(`ID: ${p.id}`);
    console.log(`  - 업체명: ${p.business_name}`);
    console.log(`  - 타입: ${p.partner_type}`);
    console.log(`  - 상태: ${p.status}`);
    console.log(`  - 활성화: ${p.is_active ? 'O' : 'X'}`);
    console.log(`  - 인증: ${p.is_verified ? 'O' : 'X'}`);
    console.log(`  - 생성일: ${p.created_at}`);
    console.log('');
  }

  // 렌트카 차량 확인
  console.log('\n🚙 렌트카 차량 확인\n');
  const vehicles = await db.execute(`
    SELECT v.id, v.partner_id, v.name, v.category, v.price_per_day, v.is_available,
           p.business_name as partner_name
    FROM rentcar_vehicles v
    LEFT JOIN partners p ON v.partner_id = p.id
    ORDER BY v.created_at DESC
    LIMIT 10
  `);

  console.log(`총 ${vehicles.rows?.length || 0}개 차량:\n`);
  for (const v of vehicles.rows || []) {
    console.log(`차량 ID: ${v.id}, 업체: ${v.partner_name || 'N/A'} (partner_id=${v.partner_id})`);
    console.log(`  - 차량명: ${v.name}`);
    console.log(`  - 카테고리: ${v.category}`);
    console.log(`  - 1일 요금: ${parseInt(v.price_per_day || 0).toLocaleString()}원`);
    console.log(`  - 예약 가능: ${v.is_available ? 'O' : 'X'}`);
    console.log('');
  }

  process.exit(0);
})();
