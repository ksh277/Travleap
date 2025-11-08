const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 숙박 벤더 대시보드 - 체크인 처리 API
 * POST /api/vendor/lodging/check-in
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
    }

    const {
      booking_id,
      room_condition,
      notes,
      actual_guests_count
    } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        error: '예약 ID가 필요합니다.'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 사용자의 vendor_id 조회
    const vendorResult = await connection.execute(
      `SELECT p.id as partner_id
       FROM partners p
       WHERE p.user_id = ? AND p.partner_type = 'lodging' AND p.is_active = 1
       LIMIT 1`,
      [userId]
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '숙박 업체 정보를 찾을 수 없습니다.'
      });
    }

    const partnerId = vendorResult.rows[0].partner_id;

    // 예약 정보 확인
    const bookingResult = await connection.execute(
      `SELECT
        b.*,
        l.partner_id
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.id = ?
      LIMIT 1`,
      [booking_id]
    );

    if (!bookingResult.rows || bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다.'
      });
    }

    const booking = bookingResult.rows[0];

    // 벤더 권한 확인
    if (booking.partner_id !== partnerId) {
      return res.status(403).json({
        success: false,
        error: '이 예약에 대한 권한이 없습니다.'
      });
    }

    // 체크인 가능 상태 확인
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        error: `체크인할 수 없는 상태입니다. (현재 상태: ${booking.status})`
      });
    }

    if (booking.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: '결제가 완료되지 않은 예약입니다.'
      });
    }

    // 체크인 날짜 확인
    const today = new Date();
    const checkInDate = new Date(booking.start_date);
    const daysDiff = Math.floor((today - checkInDate) / (1000 * 60 * 60 * 24));

    if (daysDiff < -1) {
      return res.status(400).json({
        success: false,
        error: '체크인 날짜가 아직 되지 않았습니다.'
      });
    }

    // 체크인 정보 JSON 생성
    const checkInInfo = {
      room_condition: room_condition || 'good',
      notes: notes || '',
      actual_guests_count: actual_guests_count || booking.num_adults,
      checked_in_by: userId,
      checked_in_at: new Date().toISOString()
    };

    // 체크인 처리
    await connection.execute(
      `UPDATE bookings
       SET status = 'in_use',
           check_in_info = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [JSON.stringify(checkInInfo), booking_id]
    );

    // 로그 기록 (옵션)
    try {
      await connection.execute(
        `INSERT INTO booking_logs (booking_id, action, details, created_at)
         VALUES (?, 'CHECK_IN', ?, NOW())`,
        [booking_id, JSON.stringify({
          room_condition,
          notes,
          actual_guests_count,
          checked_in_by: userId
        })]
      );
    } catch (logError) {
      console.warn('⚠️ [체크인 로그 기록 실패]:', logError.message);
    }

    return res.status(200).json({
      success: true,
      message: '체크인이 완료되었습니다.',
      data: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        status: 'in_use',
        check_in_info: checkInInfo
      }
    });

  } catch (error) {
    console.error('❌ [체크인 처리 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '체크인 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
