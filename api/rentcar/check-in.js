/**
 * 렌트카 차량 인수 체크인 API
 *
 * 기능:
 * - 바우처 검증
 * - 차량 상태 기록 (주행거리, 연료량, 손상)
 * - status: confirmed → picked_up
 * - 중복 체크인 방지
 *
 * 라우트: POST /api/rentcar/bookings/:id/check-in
 * 권한: 벤더, 관리자
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

    // 4. 예약 ID 또는 booking_number 추출
    const bookingId = req.query.id || req.params.id;
    const { booking_number } = req.body;

    if (!bookingId && !booking_number) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID or booking_number is required'
      });
    }

    // 5. 요청 데이터 파싱
    const {
      voucher_code,
      vehicle_condition,
      checked_in_by,
      notes,
      fuel_level,
      mileage,
      damage_notes
    } = req.body;

    // Voucher code not required for vendor dashboard check-in (optional)
    // if (!voucher_code) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Voucher code is required'
    //   });
    // }

    // Support both old format (vehicle_condition object) and new format (direct fields)
    const finalMileage = mileage || (vehicle_condition && vehicle_condition.mileage);
    const finalFuelLevel = fuel_level || (vehicle_condition && vehicle_condition.fuel_level);
    const finalCondition = vehicle_condition?.condition || vehicle_condition || 'good';

    if (finalMileage === undefined || finalFuelLevel === undefined) {
      return res.status(400).json({
        success: false,
        error: 'mileage and fuel_level are required'
      });
    }

    console.log(`🚗 [Check-In] Processing for booking ${bookingId || booking_number}`);

    // 6. 예약 정보 조회 (ID 또는 booking_number로)
    let query = `
      SELECT
        id,
        booking_number,
        voucher_code,
        vendor_id,
        status,
        payment_status,
        pickup_checked_in_at,
        used_at
      FROM rentcar_bookings
      WHERE ${bookingId ? 'id = ?' : 'booking_number = ?'}
      LIMIT 1
    `;
    const bookings = await db.query(query, [bookingId || booking_number]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // 7. 바우처 코드 검증 (optional - only if provided)
    if (voucher_code && booking.voucher_code && booking.voucher_code !== voucher_code.toUpperCase()) {
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

    // 9. 상태 전이 검증 (confirmed만 picked_up로 전이 가능)
    const ALLOWED_TRANSITIONS = {
      'pending': [],
      'confirmed': ['picked_up'],
      'picked_up': ['returned', 'completed'],
      'returned': ['completed'],
      'completed': [],
      'canceled': []
    };

    const currentStatus = booking.status;
    const targetStatus = 'picked_up';

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid state transition: ${currentStatus} → ${targetStatus}`,
        current_status: booking.status,
        allowed_transitions: allowedNext,
        message: 'Only CONFIRMED bookings can be checked in'
      });
    }

    console.log(`   ✅ State transition validated: ${currentStatus} → ${targetStatus}`);

    // 10. 결제 상태 확인
    if (booking.payment_status !== 'captured' && booking.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Payment not completed',
        payment_status: booking.payment_status
      });
    }

    // 11. 중복 체크인 방지
    if (booking.pickup_checked_in_at) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle already picked up',
        checked_in_at: booking.pickup_checked_in_at,
        message: 'This booking has already been checked in'
      });
    }

    // 11. 차량 상태 데이터 구성
    const conditionData = {
      mileage: finalMileage,
      fuel_level: finalFuelLevel,
      condition: finalCondition,
      damages: (vehicle_condition && vehicle_condition.damages) || [],
      damage_notes: damage_notes || notes || '',
      photos: vehicle_condition.photos || [],
      notes: notes || vehicle_condition.notes || '',
      recorded_at: new Date().toISOString(),
      recorded_by: checked_in_by || decoded.email
    };

    // 12. DB 업데이트 (체크인 처리)
    await db.execute(`
      UPDATE rentcar_bookings
      SET
        status = 'picked_up',
        pickup_checked_in_at = NOW(),
        pickup_checked_in_by = ?,
        pickup_vehicle_condition = ?,
        used_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [
      checked_in_by || decoded.email,
      JSON.stringify(conditionData),
      bookingId
    ]);

    console.log(`✅ [Check-In] Completed: ${booking.booking_number}`);

    // 13. 상태 전이 로그 기록
    try {
      await db.execute(`
        INSERT INTO rentcar_state_transitions (
          rental_id,
          from_status,
          to_status,
          transition_reason,
          transitioned_by,
          transitioned_at
        ) VALUES (?, ?, 'picked_up', 'Vehicle picked up', ?, NOW())
      `, [
        bookingId,
        currentStatus,
        checked_in_by || decoded.email
      ]);
    } catch (logError) {
      console.warn('⚠️  [Check-In] State transition log failed (non-critical):', logError.message);
    }

    // 14. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        status: 'picked_up',
        checked_in_at: new Date().toISOString(),
        checked_in_by: checked_in_by || decoded.email,
        vehicle_condition: conditionData
      },
      message: 'Vehicle check-in completed successfully'
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
