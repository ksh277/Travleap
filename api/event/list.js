const { connect } = require('@planetscale/database');

/**
 * 행사 목록 조회 API
 * GET /api/event/list
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
      event_type,
      start_date,
      end_date,
      limit = 20,
      offset = 0
    } = req.query;

    const conditions = ['e.is_active = 1'];
    const params = [];

    if (event_type) {
      conditions.push('e.event_type = ?');
      params.push(event_type);
    }

    if (start_date) {
      conditions.push('e.start_datetime >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('e.start_datetime <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.join(' AND ');

    const result = await connection.execute(
      `SELECT
        e.*,
        l.title as listing_title,
        l.rating,
        l.review_count,
        (e.total_capacity - e.current_sold) as tickets_remaining
       FROM events e
       INNER JOIN listings l ON e.listing_id = l.id
       WHERE ${whereClause}
       ORDER BY e.start_datetime ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const events = result.rows.map(evt => ({
      ...evt,
      performers: evt.performers ? JSON.parse(evt.performers) : [],
      images: evt.images ? JSON.parse(evt.images) : []
    }));

    return res.status(200).json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('❌ [Event List API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
