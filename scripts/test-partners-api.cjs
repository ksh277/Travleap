require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testPartnersAPI() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 Partners API 시뮬레이션...\n');

  try {
    const result = await connection.execute(`
      SELECT
        p.id, p.user_id, p.business_name, p.contact_name, p.email, p.phone, p.mobile_phone,
        p.business_address, p.location, p.services, p.base_price, p.base_price_text,
        p.detailed_address, p.description, p.business_hours,
        p.duration, p.min_age, p.max_capacity, p.language,
        p.tier, p.partner_type, p.is_verified, p.is_featured,
        p.is_active, p.status, p.lat, p.lng, p.images, p.created_at, p.updated_at
      FROM partners p
      ORDER BY p.created_at DESC
    `);

    console.log(`✅ Total partners: ${result.rows.length}개\n`);

    const types = {};
    result.rows.forEach(p => {
      const type = p.partner_type || 'NULL';
      types[type] = (types[type] || 0) + 1;
    });

    console.log('파트너 타입별 분포:');
    Object.entries(types).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}개`);
    });

    console.log('\n파트너 목록:');
    result.rows.forEach(p => {
      console.log(`  ID ${p.id}: ${p.business_name} (${p.partner_type || 'NULL'})`);
    });

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

testPartnersAPI().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
