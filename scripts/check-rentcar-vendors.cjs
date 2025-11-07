const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

(async () => {
  try {
    const neonPool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });
    const planetscale = connect({ url: process.env.DATABASE_URL });

    console.log('🔍 현재 렌트카 업체 확인:\n');

    // 1. Neon에서 렌트카 파트너 조회
    const neonResult = await neonPool.query(`
      SELECT id, email, name, phone, role
      FROM users
      WHERE role = 'rentcar_partner'
      ORDER BY id
    `);

    console.log('📋 Neon (users) 렌트카 파트너:');
    neonResult.rows.forEach(user => {
      console.log(`  [ID: ${user.id}] ${user.email}`);
      console.log(`    이름: ${user.name}`);
    });

    console.log('\n📋 PlanetScale (partners) 렌트카 파트너:');
    const partnersResult = await planetscale.execute(`
      SELECT id, user_id, business_name, partner_type, email, phone
      FROM partners
      WHERE partner_type = 'rentcar'
      ORDER BY id
    `);

    if (partnersResult.rows && partnersResult.rows.length > 0) {
      partnersResult.rows.forEach(partner => {
        console.log(`  [ID: ${partner.id}] user_id=${partner.user_id}, 업체명: ${partner.business_name}`);
        console.log(`    이메일: ${partner.email}, 전화: ${partner.phone}`);
      });
    } else {
      console.log('  없음');
    }

    console.log('\n📋 렌트카 상품 (listings):');
    const listingsResult = await planetscale.execute(`
      SELECT id, partner_id, title, category
      FROM listings
      WHERE category = 'rentcar'
      ORDER BY partner_id, id
    `);

    if (listingsResult.rows && listingsResult.rows.length > 0) {
      const grouped = {};
      listingsResult.rows.forEach(listing => {
        if (!grouped[listing.partner_id]) grouped[listing.partner_id] = [];
        grouped[listing.partner_id].push(listing);
      });

      Object.entries(grouped).forEach(([partnerId, listings]) => {
        console.log(`  Partner ID ${partnerId}: ${listings.length}개 상품`);
        listings.forEach(l => console.log(`    - [${l.id}] ${l.title}`));
      });
    } else {
      console.log('  없음');
    }

    await neonPool.end();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
  process.exit(0);
})();
