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
    const { city, type, page = '1', limit = '12', sortBy = 'popular' } = req.query;
    const connection = connect({ url: process.env.DATABASE_URL });

    let sql = `
      SELECT
        l.*,
        v.business_name as vendor_name,
        v.contact_name,
        v.logo_url as vendor_logo,
        (SELECT MIN(base_price_per_night)
         FROM rooms r
         LEFT JOIN rate_plans rp ON r.id = rp.room_id AND rp.is_active = 1
         WHERE r.lodging_id = l.id AND r.is_active = 1) as min_price,
        (SELECT COUNT(*)
         FROM rooms r
         WHERE r.lodging_id = l.id AND r.is_active = 1) as room_count
      FROM lodgings l
      LEFT JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE l.is_active = 1
    `;
    const params = [];

    // 도시 필터
    if (city) {
      sql += ` AND l.city = ?`;
      params.push(city);
    }

    // 숙박 타입 필터
    if (type) {
      sql += ` AND l.type = ?`;
      params.push(type);
    }

    // 정렬
    if (sortBy === 'popular' || sortBy === 'recommended') {
      sql += ` ORDER BY l.star_rating DESC, l.created_at DESC`;
    } else if (sortBy === 'latest') {
      sql += ` ORDER BY l.created_at DESC`;
    } else if (sortBy === 'price_low') {
      sql += ` ORDER BY min_price ASC`;
    } else if (sortBy === 'price_high') {
      sql += ` ORDER BY min_price DESC`;
    } else if (sortBy === 'rating') {
      sql += ` ORDER BY l.star_rating DESC`;
    } else {
      sql += ` ORDER BY l.created_at DESC`;
    }

    // 페이지네이션
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const result = await connection.execute(sql, params);

    const lodgings = (result || []).map(lodging => {
      let images = [];
      let amenities = {};

      try {
        if (lodging.images) images = JSON.parse(lodging.images);
        if (lodging.amenities) amenities = JSON.parse(lodging.amenities);
      } catch (e) {}

      return {
        id: lodging.id,
        vendor_id: lodging.vendor_id,
        name: lodging.name,
        type: lodging.type,
        vendor_name: lodging.vendor_name || lodging.name,
        vendor_logo: lodging.vendor_logo,
        description: lodging.description || '',
        address: lodging.address,
        city: lodging.city,
        district: lodging.district,
        star_rating: lodging.star_rating || 0,
        thumbnail_url: lodging.thumbnail_url || images[0] || '',
        images: Array.isArray(images) ? images : [],
        amenities: amenities,
        min_price: lodging.min_price || 0,
        room_count: lodging.room_count || 0,
        checkin_time: lodging.checkin_time,
        checkout_time: lodging.checkout_time,
        is_verified: lodging.is_verified || false
      };
    });

    // 총 개수 조회
    let countSql = 'SELECT COUNT(*) as total FROM lodgings l WHERE l.is_active = 1';
    const countParams = [];
    if (city) {
      countSql += ' AND l.city = ?';
      countParams.push(city);
    }
    if (type) {
      countSql += ' AND l.type = ?';
      countParams.push(type);
    }

    const countResult = await connection.execute(countSql, countParams);
    const total = countResult.rows?.[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: lodgings,
      total: parseInt(total),
      page: pageNum,
      limit: limitNum,
      hasMore: offset + lodgings.length < total
    });
  } catch (error) {
    console.error('Error fetching accommodation list:', error);
    return res.status(200).json({
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: 12
    });
  }
};
