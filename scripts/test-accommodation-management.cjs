require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testAccommodationManagement() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('Testing AccommodationManagement APIs:\n');

  // 1. Test /api/accommodations (업체 리스트)
  console.log('1. Testing /api/accommodations (업체 관리 탭에서 호출):\n');
  try {
    const categoryResult = await connection.execute('SELECT id FROM categories WHERE slug = ? LIMIT 1', ['stay']);
    const categoryId = categoryResult.rows[0]?.id || 1857;
    
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
        MIN(l.images) as sample_images,
        GROUP_CONCAT(DISTINCT l.location SEPARATOR ', ') as locations,
        AVG(l.rating_avg) as avg_rating,
        SUM(l.rating_count) as total_reviews
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id, p.business_name, p.contact_name, p.phone, p.email, p.tier, p.status, p.is_featured
      HAVING room_count > 0
      ORDER BY p.status = 'approved' DESC, p.is_featured DESC, avg_rating DESC
    `, [categoryId]);

    console.log('   Found ' + hotels.rows.length + ' partners with stay listings:');
    hotels.rows.forEach(row => {
      console.log('   - [' + row.partner_id + '] ' + row.business_name);
      console.log('     Rooms: ' + row.room_count + ', Min price: ' + row.min_price + ', Avg rating: ' + (row.avg_rating || 0));
      console.log('     Status: ' + row.status + ', Featured: ' + row.is_featured);
    });
  } catch (error) {
    console.log('   ERROR: ' + error.message);
  }

  // 2. Test /api/accommodations/[partnerId] (객실 리스트)
  console.log('\n2. Testing /api/accommodations/[partnerId] (객실 관리 탭에서 호출):\n');
  try {
    // Get first partner
    const categoryResult = await connection.execute('SELECT id FROM categories WHERE slug = ? LIMIT 1', ['stay']);
    const categoryId = categoryResult.rows[0]?.id;
    
    const partnersResult = await connection.execute(`
      SELECT p.id 
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ?
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING COUNT(l.id) > 0
      LIMIT 1
    `, [categoryId]);

    if (partnersResult.rows.length === 0) {
      console.log('   No partners found');
      return;
    }

    const partnerId = partnersResult.rows[0].id;
    console.log('   Testing with partner_id: ' + partnerId + '\n');

    // Get listings (rooms) for this partner
    const rooms = await connection.execute(`
      SELECT
        l.id,
        l.title as name,
        l.price_from as base_price_per_night,
        l.short_description,
        l.images,
        l.is_active,
        l.is_published
      FROM listings l
      WHERE l.partner_id = ? AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
      ORDER BY l.price_from ASC
    `, [partnerId, categoryId]);

    console.log('   Found ' + rooms.rows.length + ' rooms for this partner:');
    rooms.rows.slice(0, 5).forEach(row => {
      console.log('   - [' + row.id + '] ' + row.name);
      console.log('     Price: ' + row.base_price_per_night + ', Active: ' + row.is_active);
    });
    if (rooms.rows.length > 5) {
      console.log('   ... and ' + (rooms.rows.length - 5) + ' more rooms');
    }
  } catch (error) {
    console.log('   ERROR: ' + error.message);
  }

  console.log('\n✅ AccommodationManagement will work if APIs return this data correctly.');
}

testAccommodationManagement().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
