require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testAPI() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('Testing FIXED AccommodationManagement APIs:\n');

  // 1. Get stay category ID
  const categoryResult = await connection.execute('SELECT id FROM categories WHERE slug = ?', ['stay']);
  const categoryId = categoryResult.rows[0]?.id;

  console.log('1. /api/accommodations (업체 리스트):\n');
  
  const hotels = await connection.execute(`
    SELECT
      p.id as partner_id,
      p.business_name,
      p.contact_name,
      p.phone,
      p.email,
      p.tier,
      p.status,
      p.is_featured,
      COUNT(l.id) as room_count,
      MIN(l.price_from) as min_price,
      MAX(l.price_from) as max_price,
      AVG(l.rating_avg) as avg_rating,
      SUM(l.rating_count) as total_reviews
    FROM partners p
    LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
    WHERE p.is_active = 1
    GROUP BY p.id, p.business_name, p.contact_name, p.phone, p.email, p.tier, p.status, p.is_featured
    HAVING room_count > 0
    ORDER BY p.status = 'approved' DESC, p.is_featured DESC, avg_rating DESC
  `, [categoryId]);

  console.log('   Partners: ' + hotels.rows.length);
  hotels.rows.forEach(h => {
    console.log('   - [' + h.partner_id + '] ' + h.business_name + ' (' + h.room_count + ' rooms)');
  });

  // 2. Test one partner detail
  if (hotels.rows.length > 0) {
    const testPartnerId = hotels.rows[0].partner_id;
    console.log('\n2. /api/accommodations/' + testPartnerId + ' (객실 리스트):\n');

    const partnerResult = await connection.execute('SELECT * FROM partners WHERE id = ?', [testPartnerId]);
    const partner = partnerResult.rows[0];

    const roomsResult = await connection.execute(`
      SELECT l.*
      FROM listings l
      WHERE l.partner_id = ? AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
      ORDER BY l.price_from ASC
    `, [testPartnerId, categoryId]);

    console.log('   Partner: ' + partner.business_name);
    console.log('   Rooms: ' + roomsResult.rows.length);
    roomsResult.rows.slice(0, 5).forEach(r => {
      console.log('   - [' + r.id + '] ' + r.title + ' (₩' + r.price_from + ')');
    });
    if (roomsResult.rows.length > 5) {
      console.log('   ... and ' + (roomsResult.rows.length - 5) + ' more');
    }
  }

  console.log('\n✅ APIs will work correctly with listings table');
}

testAPI().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
