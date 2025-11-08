require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkLodging() {
  const conn = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('=== Partners 테이블 확인 ===\n');

    const allPartners = await conn.execute('SELECT COUNT(*) as count FROM partners');
    console.log(`전체 partners: ${allPartners.rows[0].count}개\n`);

    const byType = await conn.execute(`
      SELECT partner_type, COUNT(*) as count
      FROM partners
      GROUP BY partner_type
    `);

    console.log('타입별 분포:');
    byType.rows.forEach(r => {
      console.log(`  - ${r.partner_type || 'NULL'}: ${r.count}개`);
    });

    const lodgingPartners = await conn.execute(`
      SELECT id, business_name, email, partner_type
      FROM partners
      WHERE partner_type = 'lodging'
    `);

    console.log(`\n\nlodging 파트너: ${lodgingPartners.rows.length}개`);
    lodgingPartners.rows.forEach(p => {
      console.log(`  - ID ${p.id}: ${p.business_name}`);
    });

    console.log('\n\n=== Accommodation Vendors 테이블 확인 ===\n');

    const vendors = await conn.execute('SELECT COUNT(*) as count FROM accommodation_vendors');
    console.log(`전체 accommodation_vendors: ${vendors.rows[0].count}개\n`);

    const vendorList = await conn.execute(`
      SELECT id, business_name, brand_name, contact_email
      FROM accommodation_vendors
    `);

    console.log('숙박 벤더 목록:');
    vendorList.rows.forEach(v => {
      console.log(`  - ID ${v.id}: ${v.brand_name || v.business_name} (${v.contact_email})`);
    });

  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkLodging().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
