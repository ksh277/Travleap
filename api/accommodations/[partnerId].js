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

    // 1. 숙박 시설 정보 조회 (lodgings)
    const lodgingResult = await connection.execute(`
      SELECT
        l.*,
        v.business_name as vendor_name,
        v.contact_name,
        v.contact_email as email,
        v.contact_phone as phone
      FROM lodgings l
      LEFT JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE l.id = ? AND l.is_active = 1
      LIMIT 1
    `, [partnerId]);

    if (!lodgingResult.rows || lodgingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '숙박 시설을 찾을 수 없습니다.' });
    }

    const lodging = lodgingResult.rows[0];

    // JSON 파싱
    let images = [];
    let amenities = {};
    try {
      if (lodging.images) images = JSON.parse(lodging.images);
      if (lodging.amenities) amenities = JSON.parse(lodging.amenities);
    } catch (e) {
      console.error('JSON parse error:', e);
    }

    // 2. 객실 목록 조회 (rooms + rate_plans)
    const roomsResult = await connection.execute(`
      SELECT
        r.*,
        rp.base_price_per_night,
        rp.breakfast_included,
        rp.cancel_policy_code
      FROM rooms r
      LEFT JOIN rate_plans rp ON r.id = rp.room_id AND rp.is_active = 1
      WHERE r.lodging_id = ? AND r.is_active = 1
      ORDER BY r.display_order ASC, rp.base_price_per_night ASC
    `, [partnerId]);

    const rooms = (roomsResult.rows || []).map(room => {
      let roomImages = [];
      let roomAmenities = {};

      try {
        if (room.images) roomImages = JSON.parse(room.images);
        if (room.amenities) roomAmenities = JSON.parse(room.amenities);
      } catch (e) {}

      return {
        id: room.id,
        title: room.name,
        type: room.type,
        short_description: room.description || '',
        images: Array.isArray(roomImages) ? roomImages : [],
        amenities: roomAmenities,
        price_from: room.base_price_per_night || 0,
        price_to: room.base_price_per_night || 0,
        location: lodging.city || '',
        capacity: room.capacity,
        max_capacity: room.max_capacity,
        bed_type: room.bed_type,
        bed_count: room.bed_count,
        size_sqm: room.size_sqm,
        floor: room.floor,
        total_rooms: room.total_rooms,
        breakfast_included: room.breakfast_included || false,
        cancel_policy: room.cancel_policy_code || 'moderate',
        is_featured: false,
        rating_avg: 0,
        rating_count: 0,
        available_spots: room.total_rooms || 0
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        partner: {
          id: lodging.vendor_id,
          business_name: lodging.vendor_name || lodging.name,
          contact_name: lodging.contact_name || '',
          phone: lodging.phone || '',
          email: lodging.email || '',
          tier: 'standard',
          is_verified: lodging.is_verified || false
        },
        lodging: {
          id: lodging.id,
          name: lodging.name,
          type: lodging.type,
          description: lodging.description || '',
          address: lodging.address,
          city: lodging.city,
          district: lodging.district,
          star_rating: lodging.star_rating || 0,
          checkin_time: lodging.checkin_time,
          checkout_time: lodging.checkout_time,
          images: Array.isArray(images) ? images : [],
          amenities: amenities,
          phone: lodging.phone,
          email: lodging.email,
          website: lodging.website
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
