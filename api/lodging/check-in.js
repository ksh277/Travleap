/**
 * 숙박 체크인 API
 *
 * 기능:
 * - 바우처 검증
 * - 객실 상태 기록 (청결도, 편의시설, 손상)
 * - status: CONFIRMED → CHECKED_IN
 * - 중복 체크인 방지
 *
 * 라우트: POST /api/lodging/bookings/:id/check-in
 * 권한: 벤더 (프론트 데스크), 관리자
 */

const { db } = require('../../utils/database.cjs');
const { JWTUtils } = require('../../utils/jwt.cjs');

module.exports = async function handler(req, res) {
  try {
    // 1. POST 메서드만 허용
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. JWT 인증 확인
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = JWTUtils.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    // 3. 권한 확인
    const allowedRoles = ['admin', 'vendor'];
    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin or vendor role required'
      });
    }

    // 4. 예약 ID 추출
    const bookingId = req.query.id || req.params.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID is required'
      });
    }

    // 5. 요청 데이터 파싱
    const {
      voucher_code,
      room_condition,
      checked_in_by,
      notes
    } = req.body;

    if (!voucher_code) {
      return res.status(400).json({
        success: false,
        error: 'Voucher code is required'
      });
    }

    if (!room_condition) {
      return res.status(400).json({
        success: false,
        error: 'Room condition is required'
      });
    }

    // 객실 상태 필수 필드 확인
    const { cleanliness, amenities_status } = room_condition;
    if (!cleanliness || !amenities_status) {
      return res.status(400).json({
        success: false,
        error: 'cleanliness and amenities_status are required in room_condition'
      });
    }

    console.log(`🏨 [Check-In] Processing for lodging booking ID: ${bookingId}`);

    // 6. 예약 정보 조회
    const bookings = await db.query(`
      SELECT
        lb.id,
        lb.voucher_code,
        lb.lodging_id,
        lb.status,
        lb.payment_status,
        lb.checked_in_at,
        lb.used_at,
        lb.guest_name,
        l.vendor_id
      FROM lodging_bookings lb
      JOIN lodgings l ON lb.lodging_id = l.id
      WHERE lb.id = ?
      LIMIT 1
    `, [bookingId]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // 7. 바우처 코드 검증
    if (booking.voucher_code !== voucher_code.toUpperCase()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid voucher code',
        provided: voucher_code,
        expected: booking.voucher_code
      });
    }

    // 8. 벤더 권한 확인
    if (decoded.role === 'vendor' && decoded.vendorId !== booking.vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - This booking belongs to another vendor'
      });
    }

    // 9. 예약 상태 확인
    if (booking.payment_status !== 'paid' && booking.payment_status !== 'captured') {
      return res.status(400).json({
        success: false,
        error: 'Payment not completed',
        payment_status: booking.payment_status
      });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: 'Booking has been cancelled'
      });
    }

    // 10. 중복 체크인 방지
    if (booking.checked_in_at) {
      return res.status(400).json({
        success: false,
        error: 'Guest already checked in',
        checked_in_at: booking.checked_in_at,
        message: 'This booking has already been checked in'
      });
    }

    // 11. 객실 상태 데이터 구성
    const conditionData = {
      cleanliness: cleanliness, // 'excellent', 'good', 'fair', 'poor'
      amenities_status: amenities_status, // {tv: 'working', minibar: 'stocked', ...}
      damages: room_condition.damages || [],
      photos: room_condition.photos || [],
      notes: notes || room_condition.notes || '',
      recorded_at: new Date().toISOString(),
      recorded_by: checked_in_by || decoded.email
    };

    // 12. DB 업데이트 (체크인 처리)
    await db.execute(`
      UPDATE lodging_bookings
      SET
        status = 'CHECKED_IN',
        checked_in_at = NOW(),
        checked_in_by = ?,
        room_condition_checkin = ?,
        used_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [
      checked_in_by || decoded.email,
      JSON.stringify(conditionData),
      bookingId
    ]);

    console.log(`✅ [Check-In] Completed: ${booking.guest_name}`);

    // 13. 예약 로그 기록
    try {
      await db.execute(`
        INSERT INTO lodging_booking_history (
          booking_id,
          action,
          details,
          created_by,
          created_at
        ) VALUES (?, 'CHECK_IN', ?, ?, NOW())
      `, [
        bookingId,
        JSON.stringify({
          voucher_code,
          room_condition: conditionData,
          checked_in_by: checked_in_by || decoded.email
        }),
        decoded.email
      ]);
    } catch (logError) {
      console.warn('⚠️  [Check-In] History log failed (non-critical):', logError.message);
    }

    // 14. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        booking_id: booking.id,
        status: 'CHECKED_IN',
        checked_in_at: new Date().toISOString(),
        checked_in_by: checked_in_by || decoded.email,
        room_condition: conditionData
      },
      message: 'Guest check-in completed successfully'
    });

  } catch (error) {
    console.error('❌ [Check-In] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
