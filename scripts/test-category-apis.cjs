require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testCategoryAPIs() {
  const connection = connect({ url: process.env.DATABASE_URL });
  
  const categories = ['tour', 'food', 'tourist', 'popup', 'event', 'experience'];
  
  console.log('Testing category APIs with actual query:\n');
  
  for (const category of categories) {
    try {
      const sql = `
        SELECT
          l.*,
          c.name_ko as category_name,
          c.slug as category_slug,
          p.business_name as partner_name,
          p.status as partner_status
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE l.is_published = 1 AND l.is_active = 1
        AND c.slug = ?
        ORDER BY l.is_featured DESC, COALESCE(l.rating_avg, 0) DESC, COALESCE(l.rating_count, 0) DESC
        LIMIT 8
      `;
      
      const result = await connection.execute(sql, [category]);
      
      console.log(category + ' (' + (result.rows.length) + ' results):');
      if (result.rows.length > 0) {
        result.rows.forEach(row => {
          console.log('  - ' + row.title + ' (price: ' + row.price_from + ', rating: ' + (row.rating_avg || '0') + ')');
        });
      } else {
        console.log('  NO DATA RETURNED');
      }
      console.log('');
    } catch (error) {
      console.log(category + ': ERROR - ' + error.message);
      console.log('');
    }
  }
  
  console.log('\nTesting accommodations API:\n');
  try {
    const categoryResult = await connection.execute('SELECT id FROM categories WHERE slug = ? LIMIT 1', ['stay']);
    const categoryId = categoryResult.rows[0]?.id || 1857;
    
    const hotels = await connection.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        COUNT(l.id) as room_count,
        MIN(l.price_from) as min_price,
        MAX(l.price_from) as max_price,
        AVG(l.rating_avg) as avg_rating,
        SUM(l.rating_count) as total_reviews
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id, p.business_name
      HAVING room_count > 0
      ORDER BY p.status = 'approved' DESC, avg_rating DESC
    `, [categoryId]);
    
    console.log('stay (' + hotels.rows.length + ' partners):');
    hotels.rows.forEach(row => {
      console.log('  - ' + row.business_name + ' (' + row.room_count + ' rooms, min: ' + row.min_price + ')');
    });
  } catch (error) {
    console.log('stay: ERROR - ' + error.message);
  }
  
  console.log('\n\nTesting rentcar API:\n');
  try {
    const vendors = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.business_name,
        COUNT(rv.id) as vehicle_count,
        MIN(rv.daily_rate_krw) as min_price,
        MAX(rv.daily_rate_krw) as max_price
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1
      WHERE v.status = 'active'
      GROUP BY v.id, v.business_name
    `);
    
    console.log('rentcar (' + vendors.rows.length + ' vendors):');
    vendors.rows.forEach(row => {
      console.log('  - ' + row.business_name + ' (' + row.vehicle_count + ' vehicles, min: ' + row.min_price + ')');
    });
  } catch (error) {
    console.log('rentcar: ERROR - ' + error.message);
  }
}

testCategoryAPIs().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
