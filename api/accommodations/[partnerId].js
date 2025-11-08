const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { partnerId } = req.query;
    const connection = connect({ url: process.env.DATABASE_URL });

    // Get stay category ID
    const categoryResult = await connection.execute(`SELECT id FROM categories WHERE slug = 'stay' LIMIT 1`);
    const categoryId = categoryResult.rows?.[0]?.id;

    if (!categoryId) {
      return res.status(404).json({ success: false, error: '숙박 카테고리를 찾을 수 없습니다.' });
    }

    // 1. Get partner info
    const partnerResult = await connection.execute(`
      SELECT
        p.*
      FROM partners p
      WHERE p.id = ? AND p.is_active = 1
      LIMIT 1
    `, [partnerId]);

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '업체를 찾을 수 없습니다.' });
    }

    const partner = partnerResult.rows[0];

    // 2. Get all room listings for this partner
    const roomsResult = await connection.execute(`
      SELECT
        l.*
      FROM listings l
      WHERE l.partner_id = ? AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
      ORDER BY l.price_from ASC
    `, [partnerId, categoryId]);

    const rooms = (roomsResult.rows || []).map(room => {
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
        images: Array.isArray(images) ? images : [],
        description: room.description_md || room.short_description || '',
        location: room.location || ''
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          business_name: partner.business_name,
          contact_name: partner.contact_name,
          phone: partner.phone,
          email: partner.email,
          tier: partner.tier || 'standard',
          is_verified: partner.status === 'approved'
        },
        rooms,
        total_rooms: rooms.length
      }
    });
  } catch (error) {
    console.error('Error fetching accommodation details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
