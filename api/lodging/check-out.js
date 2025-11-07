/**
 * 숙박 체크아웃 API
 *
 * 기능:
 * - 객실 상태 비교 (체크인 vs 체크아웃)
 * - 미니바 소비 및 추가 요금 계산
 * - status: CHECKED_IN → CHECKED_OUT
 *
 * 라우트: POST /api/lodging/bookings/:id/check-out
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
      room_condition,
      minibar_items,
      additional_charges,
      checked_out_by,
      notes
    } = req.body;

    if (!room_condition) {
      return res.status(400).json({
        success: false,
        error: 'Room condition is required'
      });
    }

    const { cleanliness, amenities_status } = room_condition;
    if (!cleanliness || !amenities_status) {
      return res.status(400).json({
        success: false,
        error: 'cleanliness and amenities_status are required in room_condition'
      });
    }

    console.log(`📤 [Check-Out] Processing for lodging booking ID: ${bookingId}`);

    // 6. 예약 정보 조회
    const bookings = await db.query(`
      SELECT
        lb.id,
        lb.status,
        lb.checked_in_at,
        lb.room_condition_checkin,
        lb.checked_out_at,
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

    // 7. 벤더 권한 확인
    if (decoded.role === 'vendor' && decoded.vendorId !== booking.vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - This booking belongs to another vendor'
      });
    }

    // 8. 예약 상태 확인
    if (!booking.checked_in_at) {
      return res.status(400).json({
        success: false,
        error: 'Guest has not checked in yet',
        message: 'Check-in must be completed before check-out'
      });
    }

    if (booking.status === 'CHECKED_OUT' || booking.checked_out_at) {
      return res.status(400).json({
        success: false,
        error: 'Guest already checked out',
        checked_out_at: booking.checked_out_at
      });
    }

    // 9. 객실 상태 비교 (체크인 vs 체크아웃)
    let checkinCondition = {};
    try {
      if (booking.room_condition_checkin) {
        checkinCondition = JSON.parse(booking.room_condition_checkin);
      }
    } catch (parseError) {
      console.warn('⚠️  Failed to parse checkin condition:', parseError);
    }

    const comparison = {
      cleanliness_change: {
        checkin: checkinCondition.cleanliness || 'unknown',
        checkout: cleanliness
      },
      new_damages: room_condition.damages || [],
      amenities_issues: room_condition.amenities_issues || []
    };

    // 10. 미니바 요금 계산
    const minibarCharges = minibar_items || [];
    let minibar_total = 0;

    minibarCharges.forEach((item) => {
      minibar_total += (item.price || 0) * (item.quantity || 1);
    });

    // 11. 추가 요금 계산
    const charges = additional_charges || [];
    let additional_total = 0;

    charges.forEach((charge) => {
      additional_total += charge.amount || 0;
    });

    const total_additional_charges = minibar_total + additional_total;

    // 12. 체크아웃 상태 데이터 구성
    const checkoutConditionData = {
      cleanliness,
      amenities_status,
      damages: room_condition.damages || [],
      photos: room_condition.photos || [],
      notes: notes || room_condition.notes || '',
      minibar_items: minibarCharges,
      minibar_total,
      additional_charges: charges,
      additional_total,
      comparison,
      recorded_at: new Date().toISOString(),
      recorded_by: checked_out_by || decoded.email
    };

    // 13. DB 업데이트 (체크아웃 처리)
    await db.execute(`
      UPDATE lodging_bookings
      SET
        status = 'CHECKED_OUT',
        checked_out_at = NOW(),
        checked_out_by = ?,
        room_condition_checkout = ?,
        minibar_charges = ?,
        additional_charges_detail = ?,
        total_additional_charges = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      checked_out_by || decoded.email,
      JSON.stringify(checkoutConditionData),
      JSON.stringify(minibarCharges),
      JSON.stringify(charges),
      total_additional_charges,
      bookingId
    ]);

    console.log(`✅ [Check-Out] Completed: ${booking.guest_name}`);

    // 14. 예약 로그 기록
    try {
      await db.execute(`
        INSERT INTO lodging_booking_history (
          booking_id,
          action,
          details,
          created_by,
          created_at
        ) VALUES (?, 'CHECK_OUT', ?, ?, NOW())
      `, [
        bookingId,
        JSON.stringify({
          room_condition: checkoutConditionData,
          comparison,
          minibar_charges: minibarCharges,
          additional_charges: charges,
          total_additional_charges,
          checked_out_by: checked_out_by || decoded.email
        }),
        decoded.email
      ]);
    } catch (logError) {
      console.warn('⚠️  [Check-Out] History log failed (non-critical):', logError.message);
    }

    // 15. 추가 요금 알림
    let message = 'Guest check-out completed successfully';
    if (total_additional_charges > 0) {
      message += `. Additional charges: ${total_additional_charges.toLocaleString()}원`;
      if (minibar_total > 0) {
        message += ` (Minibar: ${minibar_total.toLocaleString()}원)`;
      }
    }

    // 16. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        booking_id: booking.id,
        status: 'CHECKED_OUT',
        checked_out_at: new Date().toISOString(),
        checked_out_by: checked_out_by || decoded.email,
        room_condition: checkoutConditionData,
        comparison,
        charges: {
          minibar_items: minibarCharges,
          minibar_total,
          additional_charges: charges,
          additional_total,
          total_additional_charges
        }
      },
      message
    });

  } catch (error) {
    console.error('❌ [Check-Out] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
