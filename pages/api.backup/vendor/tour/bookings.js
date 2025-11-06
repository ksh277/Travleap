/**
 * 벤더 - 투어 예약 조회 API
 * GET /api/vendor/tour/bookings - 내 투어 예약 목록 조회
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

  // 벤더 인증
  const { vendor_id } = req.query;

  if (!vendor_id) {
    return res.status(401).json({
      success: false,
      error: '벤더 인증이 필요합니다.'
    });
  }

  // GET: 내 투어 예약 목록 조회
  if (req.method === 'GET') {
    try {
      const { booking_id, package_id, schedule_id, status, from_date, to_date } = req.query;

      let query = `
        SELECT
          tb.*,
          tp.package_name,
          tp.thumbnail_url,
          ts.departure_date,
          ts.departure_time,
          ts.guide_name,
          u.username,
          u.email as user_email,
          u.phone as user_phone
        FROM tour_bookings tb
        LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
        LEFT JOIN tour_packages tp ON ts.package_id = tp.id
        LEFT JOIN users u ON tb.user_id = u.id
        WHERE tp.vendor_id = ?
      `;

      const params = [vendor_id];

      if (booking_id) {
        query += ` AND tb.id = ?`;
        params.push(booking_id);
      }

      if (package_id) {
        query += ` AND ts.package_id = ?`;
        params.push(package_id);
      }

      if (schedule_id) {
        query += ` AND tb.schedule_id = ?`;
        params.push(schedule_id);
      }

      if (status) {
        query += ` AND tb.status = ?`;
        params.push(status);
      }

      if (from_date) {
        query += ` AND ts.departure_date >= ?`;
        params.push(from_date);
      }

      if (to_date) {
        query += ` AND ts.departure_date <= ?`;
        params.push(to_date);
      }

      query += `
        ORDER BY tb.created_at DESC
      `;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        bookings: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Vendor Tour Bookings GET] Error:', error);
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
