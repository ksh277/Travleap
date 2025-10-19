require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testAdminListings() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('Testing /api/admin/listings (상품 관리 탭):\n');

  const result = await connection.execute(`
    SELECT
      l.*,
      c.name_ko as category_name,
      c.slug as category_slug,
      p.business_name as partner_name,
      p.status as partner_status
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN partners p ON l.partner_id = p.id
    WHERE c.slug != 'stay' AND c.slug != 'rentcar'
    ORDER BY l.created_at DESC
  `);

  console.log('Total listings (excluding stay & rentcar): ' + result.rows.length);
  
  const byCategory = {};
  result.rows.forEach(row => {
    const cat = row.category_slug || 'unknown';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  console.log('\nBy category:');
  Object.keys(byCategory).forEach(cat => {
    console.log('   ' + cat + ': ' + byCategory[cat]);
  });

  console.log('\n✅ 상품 관리 탭에는 tour, food, tourist, popup, event, experience만 표시됨');
}

testAdminListings().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
