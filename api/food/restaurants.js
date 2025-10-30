const { connect } = require('@planetscale/database');

/**
 * 음식점 목록 조회 API
 * GET /api/food/restaurants
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      cuisine_type,
      accepts_reservations,
      accepts_takeout,
      accepts_delivery,
      limit = 20,
      offset = 0
    } = req.query;

    const conditions = ['r.is_active = 1'];
    const params = [];

    if (cuisine_type) {
      conditions.push('r.cuisine_type = ?');
      params.push(cuisine_type);
    }

    if (accepts_reservations !== undefined) {
      conditions.push('r.accepts_reservations = ?');
      params.push(accepts_reservations === 'true' ? 1 : 0);
    }

    if (accepts_takeout !== undefined) {
      conditions.push('r.accepts_takeout = ?');
      params.push(accepts_takeout === 'true' ? 1 : 0);
    }

    if (accepts_delivery !== undefined) {
      conditions.push('r.accepts_delivery = ?');
      params.push(accepts_delivery === 'true' ? 1 : 0);
    }

    const whereClause = conditions.join(' AND ');

    const result = await connection.execute(
      `SELECT
        r.*,
        l.title as listing_title,
        l.rating,
        l.review_count
       FROM restaurants r
       INNER JOIN listings l ON r.listing_id = l.id
       WHERE ${whereClause}
       ORDER BY l.rating DESC, r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const restaurants = result.rows.map(r => ({
      ...r,
      food_categories: r.food_categories ? JSON.parse(r.food_categories) : [],
      operating_hours: r.operating_hours ? JSON.parse(r.operating_hours) : {},
      break_time: r.break_time ? JSON.parse(r.break_time) : null,
      images: r.images ? JSON.parse(r.images) : [],
      menu_images: r.menu_images ? JSON.parse(r.menu_images) : []
    }));

    return res.status(200).json({
      success: true,
      data: restaurants
    });

  } catch (error) {
    console.error('❌ [Food Restaurants API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
