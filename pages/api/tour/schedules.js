/**
 * 사용자용 - 투어 일정 조회 API
 * GET /api/tour/schedules?package_id=123 - 특정 패키지의 가능한 출발 일정 목록
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  if (req.method === 'GET') {
    try {
      const { package_id, from_date, to_date } = req.query;

      if (!package_id) {
        return res.status(400).json({
          success: false,
          error: 'package_id가 필요합니다.'
        });
      }

      let query = `
        SELECT
          ts.*,
          tp.package_name,
          tp.duration_days,
          tp.duration_nights,
          tp.thumbnail_url,
          (ts.max_participants - ts.current_participants) as available_seats
        FROM tour_schedules ts
        LEFT JOIN tour_packages tp ON ts.package_id = tp.id
        WHERE ts.package_id = ?
          AND ts.departure_date >= CURDATE()
          AND ts.status IN ('scheduled', 'confirmed')
      `;

      const params = [package_id];

      if (from_date) {
        query += ` AND ts.departure_date >= ?`;
        params.push(from_date);
      }

      if (to_date) {
        query += ` AND ts.departure_date <= ?`;
        params.push(to_date);
      }

      query += ` ORDER BY ts.departure_date ASC, ts.departure_time ASC`;

      const result = await connection.execute(query, params);

      const schedules = (result.rows || []).map(schedule => ({
        ...schedule,
        is_available: schedule.available_seats > 0 && schedule.status !== 'canceled',
        is_almost_full: schedule.available_seats > 0 && schedule.available_seats <= schedule.min_participants
      }));

      return res.status(200).json({
        success: true,
        schedules
      });

    } catch (error) {
      console.error('❌ [Tour Schedules API] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
