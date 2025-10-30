const { connect } = require('@planetscale/database');

/**
 * 체험 프로그램 목록 조회 API
 * GET /api/experience/list
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
      type,
      difficulty,
      min_price,
      max_price,
      limit = 20,
      offset = 0
    } = req.query;

    const conditions = ['e.is_active = 1'];
    const params = [];

    if (type) {
      conditions.push('e.type = ?');
      params.push(type);
    }

    if (difficulty) {
      conditions.push('e.difficulty = ?');
      params.push(difficulty);
    }

    if (min_price) {
      conditions.push('e.price_krw >= ?');
      params.push(parseInt(min_price));
    }

    if (max_price) {
      conditions.push('e.price_krw <= ?');
      params.push(parseInt(max_price));
    }

    const whereClause = conditions.join(' AND ');

    const result = await connection.execute(
      `SELECT
        e.*,
        l.title as listing_title,
        l.rating,
        l.review_count
       FROM experiences e
       INNER JOIN listings l ON e.listing_id = l.id
       WHERE ${whereClause}
       ORDER BY l.rating DESC, e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const experiences = result.rows.map(exp => ({
      ...exp,
      equipment_included: exp.equipment_included ? JSON.parse(exp.equipment_included) : [],
      weather_conditions: exp.weather_conditions ? JSON.parse(exp.weather_conditions) : null,
      images: exp.images ? JSON.parse(exp.images) : [],
      videos: exp.videos ? JSON.parse(exp.videos) : []
    }));

    return res.status(200).json({
      success: true,
      data: experiences
    });

  } catch (error) {
    console.error('❌ [Experience List API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
