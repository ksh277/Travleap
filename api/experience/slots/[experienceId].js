const { connect } = require('@planetscale/database');

/**
 * 체험 슬롯 조회 API
 * GET /api/experience/slots/[experienceId]
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
    const { experienceId } = req.query;
    const { start_date, end_date } = req.query;

    if (!experienceId) {
      return res.status(400).json({
        success: false,
        error: '체험 ID가 필요합니다.'
      });
    }

    const start = start_date || new Date().toISOString().split('T')[0];
    const end = end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await connection.execute(
      `SELECT
        es.*,
        (es.max_participants - es.current_participants) as available_seats
       FROM experience_slots es
       WHERE es.experience_id = ?
         AND es.date >= ?
         AND es.date <= ?
         AND es.status IN ('scheduled', 'confirmed')
         AND es.weather_status != 'canceled'
       ORDER BY es.date ASC, es.start_time ASC`,
      [experienceId, start, end]
    );

    const slotsByDate = {};
    result.rows.forEach(slot => {
      const date = slot.date.toISOString().split('T')[0];
      if (!slotsByDate[date]) {
        slotsByDate[date] = [];
      }
      slotsByDate[date].push({
        ...slot,
        is_available: slot.available_seats > 0,
        weather_data: slot.weather_data ? JSON.parse(slot.weather_data) : null
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        slots: result.rows,
        slotsByDate
      }
    });

  } catch (error) {
    console.error('❌ [Experience Slots API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
