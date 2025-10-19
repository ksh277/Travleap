require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkAPIResponse() {
  const connection = connect({ url: process.env.DATABASE_URL });

  // Get partner ID
  const categoryResult = await connection.execute('SELECT id FROM categories WHERE slug = ?', ['stay']);
  const categoryId = categoryResult.rows[0]?.id;

  const partners = await connection.execute(`
    SELECT p.id FROM partners p
    LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ?
    WHERE p.is_active = 1
    GROUP BY p.id
    HAVING COUNT(l.id) > 0
    LIMIT 1
  `, [categoryId]);

  const partnerId = partners.rows[0].id;

  console.log('Testing API response for /api/accommodations/' + partnerId + ':\n');

  // Simulate API query
  const partnerResult = await connection.execute('SELECT * FROM partners WHERE id = ?', [partnerId]);
  const partner = partnerResult.rows[0];

  const roomsResult = await connection.execute(`
    SELECT l.*
    FROM listings l
    WHERE l.partner_id = ? AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
  `, [partnerId, categoryId]);

  // Map rooms like API does
  const rooms = roomsResult.rows.map(room => {
    let images = [];
    try {
      if (room.images) images = JSON.parse(room.images);
    } catch (e) {}

    return {
      id: room.id,
      name: room.title,
      room_type: room.short_description || '객실',
      capacity: 2,
      base_price_per_night: room.price_from || 0,
      breakfast_included: false,
      is_available: room.is_active && room.is_published,
      images: images,
      description: room.description_md || room.short_description || '',
      location: room.location || ''
    };
  });

  console.log('API would return:');
  console.log(JSON.stringify({
    success: true,
    data: {
      partner: {
        id: partner.id,
        business_name: partner.business_name
      },
      rooms: rooms.slice(0, 3),
      total_rooms: rooms.length
    }
  }, null, 2));
}

checkAPIResponse().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
