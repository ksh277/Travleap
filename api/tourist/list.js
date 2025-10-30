const { connect } = require('@planetscale/database');

/**
 * 관광지 목록 조회 API
 * GET /api/tourist/list
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
      category,
      wheelchair_accessible,
      limit = 20,
      offset = 0
    } = req.query;

    const conditions = ['a.is_active = 1'];
    const params = [];

    if (type) {
      conditions.push('a.type = ?');
      params.push(type);
    }

    if (category) {
      conditions.push('a.category = ?');
      params.push(category);
    }

    if (wheelchair_accessible !== undefined) {
      conditions.push('a.wheelchair_accessible = ?');
      params.push(wheelchair_accessible === 'true' ? 1 : 0);
    }

    const whereClause = conditions.join(' AND ');

    const result = await connection.execute(
      `SELECT
        a.*,
        l.title as listing_title,
        l.rating,
        l.review_count
       FROM attractions a
       INNER JOIN listings l ON a.listing_id = l.id
       WHERE ${whereClause}
       ORDER BY l.rating DESC, a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const attractions = result.rows.map(attr => ({
      ...attr,
      operating_hours: attr.operating_hours ? JSON.parse(attr.operating_hours) : {},
      free_entry_days: attr.free_entry_days ? JSON.parse(attr.free_entry_days) : [],
      highlights: attr.highlights ? JSON.parse(attr.highlights) : [],
      images: attr.images ? JSON.parse(attr.images) : []
    }));

    return res.status(200).json({
      success: true,
      data: attractions
    });

  } catch (error) {
    console.error('❌ [Tourist List API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
