/**
 * 숙박 바우처 검증 API
 *
 * 기능:
 * - 바우처 코드로 예약 정보 조회
 * - 예약 상태 및 결제 상태 확인
 * - 체크인 가능 여부 검증
 *
 * 라우트: GET /api/lodging/verify/:voucherCode
 * 권한: 프론트 데스크 직원 (vendor), 관리자
 */

const { db } = require('../../utils/database.cjs');
const { JWTUtils } = require('../../utils/jwt.cjs');

module.exports = async function handler(req, res) {
  try {
    // 1. GET 메서드만 허용
    if (req.method !== 'GET') {
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

    // 3. 권한 확인 (admin 또는 vendor만)
    const allowedRoles = ['admin', 'vendor'];
    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin or vendor role required'
      });
    }

    // 4. 바우처 코드 추출
    const voucherCode = req.query.voucherCode || req.params.voucherCode;

    if (!voucherCode) {
      return res.status(400).json({
        success: false,
        error: 'Voucher code is required'
      });
    }

    console.log(`🔍 [Verify-Voucher] Checking voucher: ${voucherCode}`);

    // 5. 바우처로 예약 조회
    const bookings = await db.query(`
      SELECT
        lb.id,
        lb.voucher_code,
        lb.guest_name,
        lb.guest_email,
        lb.guest_phone,
        lb.guest_count,
        lb.checkin_date,
        lb.checkout_date,
        lb.nights,
        lb.room_price,
        lb.total_price,
        lb.status,
        lb.payment_status,
        lb.checked_in_at,
        lb.checked_out_at,
        lb.used_at,
        lb.cancelled_at,
        lb.cancel_reason,
        l.id as lodging_id,
        l.name as lodging_name,
        l.address as lodging_address,
        l.phone as lodging_phone,
        l.checkin_time,
        l.checkout_time,
        r.id as room_id,
        r.name as room_name,
        r.type as room_type
      FROM lodging_bookings lb
      JOIN lodgings l ON lb.lodging_id = l.id
      JOIN rooms r ON lb.room_id = r.id
      WHERE lb.voucher_code = ?
      LIMIT 1
    `, [voucherCode.toUpperCase()]);

    if (bookings.length === 0) {
      console.log(`❌ [Verify-Voucher] Not found: ${voucherCode}`);

      return res.status(404).json({
        success: false,
        error: 'Voucher not found',
        voucher_code: voucherCode
      });
    }

    const booking = bookings[0];

    // 6. 벤더 권한 확인 (vendor는 자신의 숙소만 확인 가능)
    if (decoded.role === 'vendor') {
      // vendor의 lodging_id 확인 필요
      const vendorLodgings = await db.query(`
        SELECT id FROM lodgings WHERE vendor_id = ?
      `, [decoded.vendorId]);

      const vendorLodgingIds = vendorLodgings.map((l) => l.id);

      if (!vendorLodgingIds.includes(booking.lodging_id)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - This booking belongs to another vendor'
        });
      }
    }

    // 7. 예약 상태 검증
    const validation = {
      is_valid: true,
      warnings: [],
      errors: []
    };

    // 결제 상태 확인
    if (booking.payment_status !== 'paid' && booking.payment_status !== 'captured') {
      validation.is_valid = false;
      validation.errors.push('Payment not completed');
    }

    // 예약 취소 여부
    if (booking.status === 'CANCELLED') {
      validation.is_valid = false;
      validation.errors.push('Booking has been cancelled');
    }

    // 이미 체크인했는지 확인
    if (booking.checked_in_at) {
      validation.warnings.push('Guest already checked in');
      validation.already_checked_in = true;
    }

    // 이미 체크아웃했는지 확인
    if (booking.checked_out_at) {
      validation.warnings.push('Guest already checked out');
      validation.already_checked_out = true;
    }

    // 체크인 날짜 확인
    const today = new Date().toISOString().split('T')[0];
    const checkinDate = new Date(booking.checkin_date).toISOString().split('T')[0];

    if (checkinDate > today) {
      validation.warnings.push('Check-in date is in the future');
      validation.early_checkin = true;
    } else if (checkinDate < today && !booking.checked_in_at) {
      validation.warnings.push('Check-in date has passed (possible no-show)');
      validation.late_checkin = true;
    }

    console.log(`✅ [Verify-Voucher] Found: ${booking.guest_name} - ${booking.lodging_name}`);

    // 8. 히스토리 로그 기록
    try {
      await db.execute(`
        INSERT INTO lodging_booking_history (
          booking_id,
          action,
          details,
          created_by,
          created_at
        ) VALUES (?, 'VOUCHER_VERIFIED', ?, ?, NOW())
      `, [
        booking.id,
        JSON.stringify({
          voucher_code: voucherCode,
          verified_by: decoded.email,
          validation
        }),
        decoded.email
      ]);
    } catch (logError) {
      console.warn('⚠️  [Verify-Voucher] History log failed (non-critical):', logError.message);
    }

    // 9. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        booking_id: booking.id,
        voucher_code: booking.voucher_code,
        guest_info: {
          name: booking.guest_name,
          email: booking.guest_email,
          phone: booking.guest_phone,
          guest_count: booking.guest_count
        },
        lodging_info: {
          id: booking.lodging_id,
          name: booking.lodging_name,
          address: booking.lodging_address,
          phone: booking.lodging_phone,
          checkin_time: booking.checkin_time,
          checkout_time: booking.checkout_time
        },
        room_info: {
          id: booking.room_id,
          name: booking.room_name,
          type: booking.room_type
        },
        stay_info: {
          checkin_date: booking.checkin_date,
          checkout_date: booking.checkout_date,
          nights: booking.nights
        },
        booking_status: {
          status: booking.status,
          payment_status: booking.payment_status,
          checked_in_at: booking.checked_in_at,
          checked_out_at: booking.checked_out_at,
          used_at: booking.used_at
        },
        pricing: {
          room_price: booking.room_price,
          total_price: booking.total_price
        },
        validation
      },
      message: validation.is_valid
        ? 'Voucher is valid and ready for check-in'
        : 'Voucher has validation issues'
    });

  } catch (error) {
    console.error('❌ [Verify-Voucher] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
