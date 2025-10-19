require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testAPIs() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('1. Testing /api/listings for each category:\n');

  const categories = ['tour', 'food', 'tourist', 'popup', 'event', 'experience'];
  
  for (const cat of categories) {
    try {
      const result = await connection.execute(
        'SELECT c.id FROM categories c WHERE c.slug = ?',
        [cat]
      );
      
      if (result.rows.length === 0) {
        console.log('   ' + cat + ': Category NOT FOUND in DB');
        continue;
      }
      
      const categoryId = result.rows[0].id;
      
      const listings = await connection.execute(
        'SELECT l.id, l.title, l.price_from, l.is_published, l.is_active FROM listings l WHERE l.category_id = ? AND l.is_published = 1 AND l.is_active = 1',
        [categoryId]
      );
      
      console.log('   ' + cat + ' (id=' + categoryId + '): ' + listings.rows.length + ' published listings');
      if (listings.rows.length > 0) {
        console.log('      Example: "' + listings.rows[0].title + '" - price: ' + listings.rows[0].price_from);
      }
    } catch (error) {
      console.log('   ' + cat + ': ERROR - ' + error.message);
    }
  }

  console.log('\n2. Testing accommodations (stay category):\n');
  try {
    const stayId = await connection.execute('SELECT id FROM categories WHERE slug = ?', ['stay']);
    const categoryId = stayId.rows[0].id;
    
    const hotels = await connection.execute(
      'SELECT p.id, p.business_name, COUNT(l.id) as room_count FROM partners p LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1 WHERE p.is_active = 1 GROUP BY p.id HAVING room_count > 0',
      [categoryId]
    );
    
    console.log('   Partners with stay listings: ' + hotels.rows.length);
    if (hotels.rows.length > 0) {
      console.log('      Example: "' + hotels.rows[0].business_name + '" - ' + hotels.rows[0].room_count + ' rooms');
    }
  } catch (error) {
    console.log('   ERROR: ' + error.message);
  }

  console.log('\n3. Testing rentcar vendors:\n');
  try {
    const vendors = await connection.execute(
      'SELECT v.id, v.business_name, COUNT(rv.id) as vehicle_count FROM rentcar_vendors v LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1 WHERE v.status = ? GROUP BY v.id',
      ['active']
    );
    
    console.log('   Active vendors: ' + vendors.rows.length);
    if (vendors.rows.length > 0) {
      console.log('      Example: "' + vendors.rows[0].business_name + '" - ' + vendors.rows[0].vehicle_count + ' vehicles');
    }
  } catch (error) {
    console.log('   ERROR: ' + error.message);
  }
}

testAPIs().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
