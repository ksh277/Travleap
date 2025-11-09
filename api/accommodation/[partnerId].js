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

    // 파트너 정보 조회
    const partnerResult = await connection.execute(`
      SELECT * FROM partners
      WHERE id = ? AND is_active = 1
      LIMIT 1
    `, [partnerId]);

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '호텔을 찾을 수 없습니다.' });
    }

    const partner = partnerResult.rows[0];

    // 객실 목록 조회
    const roomsResult = await connection.execute(`
      SELECT * FROM listings
      WHERE partner_id = ? AND category_id = 1857 AND is_published = 1 AND is_active = 1
      ORDER BY price_from ASC
    `, [partnerId]);

    const rooms = (roomsResult.rows || []).map(room => {
      let images = [];
      let amenities = [];
      let highlights = [];

      try {
        if (room.images) images = JSON.parse(room.images);
        if (room.amenities) amenities = JSON.parse(room.amenities);
        if (room.highlights) highlights = JSON.parse(room.highlights);
      } catch (e) {}

      return {
        ...room,
        images: Array.isArray(images) ? images : [],
        amenities: Array.isArray(amenities) ? amenities : [],
        highlights: Array.isArray(highlights) ? highlights : []
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        partner,
        rooms
      }
    });
  } catch (error) {
    console.error('Error fetching accommodation details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
