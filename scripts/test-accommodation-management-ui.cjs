require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testUI() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('Testing AccommodationManagement UI flow:\n');

  // 1. Load partners (업체 관리 탭)
  console.log('1. Load partners for 업체 관리 tab:');
  const categoryResult = await connection.execute('SELECT id FROM categories WHERE slug = ?', ['stay']);
  const categoryId = categoryResult.rows[0]?.id;

  const hotels = await connection.execute(`
    SELECT
      p.id as partner_id,
      p.business_name,
      COUNT(l.id) as room_count,
      MIN(l.price_from) as min_price,
      AVG(l.rating_avg) as avg_rating,
      SUM(l.rating_count) as total_reviews
    FROM partners p
    LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
    WHERE p.is_active = 1
    GROUP BY p.id, p.business_name
    HAVING room_count > 0
  `, [categoryId]);

  console.log('   Partners loaded: ' + hotels.rows.length);
  hotels.rows.forEach(h => {
    console.log('   - [' + h.partner_id + '] ' + h.business_name + ' (' + h.room_count + ' rooms)');
  });

  // 2. Click first partner (객실 관리 탭으로 전환)
  if (hotels.rows.length > 0) {
    const firstPartner = hotels.rows[0];
    console.log('\n2. User clicks partner [' + firstPartner.partner_id + '] - should load rooms:');

    const rooms = await connection.execute(`
      SELECT
        l.id,
        l.title as name,
        l.short_description as room_type,
        l.price_from as base_price_per_night,
        l.is_active,
        l.is_published
      FROM listings l
      WHERE l.partner_id = ? AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
    `, [firstPartner.partner_id, categoryId]);

    console.log('   Rooms loaded: ' + rooms.rows.length);
    rooms.rows.slice(0, 5).forEach(r => {
      console.log('   - [' + r.id + '] ' + r.name + ' (₩' + r.base_price_per_night + ')');
    });
  }

  console.log('\n3. Check RentcarManagement data:');
  const vendors = await connection.execute(`
    SELECT v.id, v.business_name, COUNT(rv.id) as vehicle_count
    FROM rentcar_vendors v
    LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1
    WHERE v.status = 'active'
    GROUP BY v.id, v.business_name
  `);

  console.log('   Vendors loaded: ' + vendors.rows.length);
  vendors.rows.forEach(v => {
    console.log('   - [' + v.id + '] ' + v.business_name + ' (' + v.vehicle_count + ' vehicles)');
  });
}

testUI().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
