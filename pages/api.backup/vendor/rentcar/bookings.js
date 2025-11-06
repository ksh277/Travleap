/**
 * 벤더 - 렌트카 예약 조회 API
 * GET /api/vendor/rentcar/bookings - 내 차량 예약 목록 조회
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

  // GET: 내 차량 예약 목록 조회
  if (req.method === 'GET') {
    try {
      const { booking_id, vehicle_id, status, from_date, to_date } = req.query;

      let query = `
        SELECT
          b.*,
          v.display_name as vehicle_name,
          v.brand,
          v.model
        FROM rentcar_bookings b
        LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        WHERE b.vendor_id = ?
      `;

      const params = [vendor_id];

      if (booking_id) {
        query += ` AND b.id = ?`;
        params.push(booking_id);
      }
      if (vehicle_id) {
        query += ` AND b.vehicle_id = ?`;
        params.push(vehicle_id);
      }
      if (status) {
        query += ` AND b.status = ?`;
        params.push(status);
      }
      if (from_date) {
        query += ` AND b.pickup_date >= ?`;
        params.push(from_date);
      }
      if (to_date) {
        query += ` AND b.pickup_date <= ?`;
        params.push(to_date);
      }

      query += ` ORDER BY b.created_at DESC`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        bookings: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Vendor Rentcar Bookings GET] Error:', error);
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
