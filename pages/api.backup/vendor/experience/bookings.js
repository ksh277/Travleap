/**
 * 벤더 - 체험 예약 관리 API
 * GET /api/vendor/experience/bookings - 내 체험 예약 목록 조회
 * PUT /api/vendor/experience/bookings - 예약 상태 변경
 */

const { connect } = require('@planetscale/database');
const { verifyJWT } = require('../../../../utils/jwt');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // JWT 인증
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      success: false,
      error: '인증 토큰이 필요합니다.'
    });
  }

  let decoded;
  try {
    decoded = verifyJWT(token);
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '유효하지 않은 토큰입니다.'
    });
  }

  if (decoded.role !== 'vendor') {
    return res.status(403).json({
      success: false,
      error: '벤더 권한이 필요합니다.'
    });
  }

  const vendor_id = decoded.userId;
  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 예약 목록 조회
  if (req.method === 'GET') {
    try {
      const {
        booking_id,
        experience_id,
        status,
        experience_date,
        from_date,
        to_date
      } = req.query;

      let query = `
        SELECT
          eb.*,
          e.name as experience_name,
          e.location,
          e.duration_minutes,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          es.slot_date,
          es.start_time,
          es.end_time,
          es.max_participants,
          es.current_participants
        FROM experience_bookings eb
        LEFT JOIN experiences e ON eb.experience_id = e.id
        LEFT JOIN users u ON eb.user_id = u.id
        LEFT JOIN experience_slots es ON eb.slot_id = es.id
        WHERE e.vendor_id = ?
      `;

      const params = [vendor_id];

      if (booking_id) {
        query += ` AND eb.id = ?`;
        params.push(booking_id);
      }

      if (experience_id) {
        query += ` AND eb.experience_id = ?`;
        params.push(experience_id);
      }

      if (status) {
        query += ` AND eb.status = ?`;
        params.push(status);
      }

      if (experience_date) {
        query += ` AND eb.experience_date = ?`;
        params.push(experience_date);
      }

      if (from_date) {
        query += ` AND eb.experience_date >= ?`;
        params.push(from_date);
      }

      if (to_date) {
        query += ` AND eb.experience_date <= ?`;
        params.push(to_date);
      }

      query += ` ORDER BY eb.experience_date DESC, eb.experience_time DESC, eb.created_at DESC`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        bookings: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Vendor Experience Bookings GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 예약 상태 변경
  if (req.method === 'PUT') {
    try {
      const { booking_id, status, admin_note } = req.body;

      if (!booking_id || !status) {
        return res.status(400).json({
          success: false,
          error: 'booking_id와 status가 필요합니다.'
        });
      }

      // 유효한 상태 값 체크
      const validStatuses = ['pending', 'confirmed', 'completed', 'canceled', 'refunded', 'no_show'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 상태입니다.'
        });
      }

      // 예약이 벤더 소유의 체험 예약인지 확인
      const bookingCheck = await connection.execute(`
        SELECT eb.id, eb.status as current_status, eb.total_krw
        FROM experience_bookings eb
        LEFT JOIN experiences e ON eb.experience_id = e.id
        WHERE eb.id = ? AND e.vendor_id = ?
      `, [booking_id, vendor_id]);

      if (!bookingCheck.rows || bookingCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 체험 예약만 관리할 수 있습니다.'
        });
      }

      const booking = bookingCheck.rows[0];
      const currentStatus = booking.current_status;

      // 상태 변경 로직
      let updateQuery = 'UPDATE experience_bookings SET status = ?, updated_at = NOW()';
      const values = [status];

      if (admin_note) {
        updateQuery += ', admin_note = ?';
        values.push(admin_note);
      }

      // 확정 시 확정 시간 기록
      if (status === 'confirmed' && currentStatus === 'pending') {
        updateQuery += ', confirmed_at = NOW()';
      }

      // 완료 시 완료 시간 기록
      if (status === 'completed') {
        updateQuery += ', completed_at = NOW()';
      }

      // 취소 시 취소 시간 기록
      if (status === 'canceled') {
        updateQuery += ', canceled_at = NOW()';
      }

      updateQuery += ' WHERE id = ?';
      values.push(booking_id);

      await connection.execute(updateQuery, values);

      console.log(`✅ [Vendor Experience Booking] 상태 변경: booking_id=${booking_id}, status=${status} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '예약 상태가 변경되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Experience Bookings PUT] Error:', error);
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
