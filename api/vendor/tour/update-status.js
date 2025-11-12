const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 투어 예약 상태 변경 API
 * POST /api/vendor/tour/update-status
 *
 * Body:
 * - booking_id: 예약 ID
 * - status: 변경할 상태 (confirmed, canceled, completed)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // JWT 인증 확인
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No token provided'
    });
  }

  const token = authHeader.substring(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid token'
    });
  }

  // 벤더 또는 관리자 권한 확인
  if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - Vendor role required'
    });
  }

  const { booking_id, status } = req.body;

  if (!booking_id || !status) {
    return res.status(400).json({
      success: false,
      error: 'booking_id와 status는 필수입니다.'
    });
  }

  const validStatuses = ['pending', 'confirmed', 'canceled', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `유효하지 않은 상태입니다. 가능한 값: ${validStatuses.join(', ')}`
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 벤더의 vendor_id 조회
    let vendor_id;
    if (decoded.role === 'admin') {
      // 관리자는 모든 예약 변경 가능
      vendor_id = null;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM partners WHERE user_id = ? AND partner_type = ? LIMIT 1',
        [decoded.userId, 'tour']
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '등록된 투어 벤더 정보가 없습니다.'
        });
      }

      vendor_id = vendorResult.rows[0].id;
    }

    // 예약 정보 확인 (벤더 소유 확인)
    let bookingCheck;
    if (vendor_id) {
      bookingCheck = await connection.execute(
        `SELECT tb.id, tb.status, tp.vendor_id
         FROM tour_bookings tb
         INNER JOIN tour_schedules ts ON tb.schedule_id = ts.id
         INNER JOIN tour_packages tp ON ts.package_id = tp.id
         WHERE tb.id = ? AND tp.vendor_id = ?`,
        [booking_id, vendor_id]
      );
    } else {
      bookingCheck = await connection.execute(
        'SELECT id, status FROM tour_bookings WHERE id = ?',
        [booking_id]
      );
    }

    if (!bookingCheck.rows || bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없거나 권한이 없습니다.'
      });
    }

    // 상태 변경
    const updateResult = await connection.execute(
      'UPDATE tour_bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, booking_id]
    );

    if (updateResult.rowsAffected === 0) {
      return res.status(500).json({
        success: false,
        error: '상태 변경에 실패했습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      message: '예약 상태가 변경되었습니다.',
      data: {
        booking_id,
        old_status: bookingCheck.rows[0].status,
        new_status: status
      }
    });

  } catch (error) {
    console.error('❌ [Tour Update Status API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
