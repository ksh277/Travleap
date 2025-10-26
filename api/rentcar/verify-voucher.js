/**
 * 렌트카 바우처 검증 API
 *
 * 기능:
 * - 바우처 코드로 예약 확인
 * - QR 스캔 결과 검증
 * - 사용 여부 확인 (중복 사용 방지)
 *
 * 라우트: GET /api/rentcar/verify/:voucherCode
 * 권한: 벤더, 관리자
 */

const { db } = require('../../utils/database');
const { JWTUtils } = require('../../utils/jwt');

module.exports = async function handler(req, res) {
  try {
    // 1. GET 메서드만 허용
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. JWT 인증 확인 (벤더/관리자만)
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

    // 4. 바우처 코드 추출
    const voucherCode = (req.query.voucherCode || req.params.voucherCode || '').toUpperCase();

    if (!voucherCode) {
      return res.status(400).json({
        success: false,
        error: 'Voucher code is required'
      });
    }

    console.log(`🔍 [Verify] Checking voucher: ${voucherCode}`);

    // 5. 예약 조회
    const bookings = await db.query(`
      SELECT
        b.id,
        b.booking_number,
        b.voucher_code,
        b.vendor_id,
        b.vehicle_id,
        b.customer_name,
        b.customer_email,
        b.customer_phone,
        b.pickup_date,
        b.pickup_time,
        b.dropoff_date,
        b.dropoff_time,
        b.status,
        b.payment_status,
        b.pickup_checked_in_at,
        b.used_at,
        v.brand,
        v.model,
        v.display_name,
        ven.name as vendor_name,
        pl.name as pickup_location_name
      FROM rentcar_bookings b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_vendors ven ON b.vendor_id = ven.id
      LEFT JOIN rentcar_locations pl ON b.pickup_location_id = pl.id
      WHERE b.voucher_code = ?
      LIMIT 1
    `, [voucherCode]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid voucher code',
        voucher_code: voucherCode
      });
    }

    const booking = bookings[0];

    // 6. 예약 상태 검증
    const validation = {
      is_valid: true,
      warnings: [],
      errors: []
    };

    // 결제 상태 확인
    if (booking.payment_status !== 'paid') {
      validation.is_valid = false;
      validation.errors.push('Payment not completed');
    }

    // 취소 여부 확인
    if (booking.status === 'cancelled') {
      validation.is_valid = false;
      validation.errors.push('Booking has been cancelled');
    }

    // 이미 사용됨 확인
    if (booking.pickup_checked_in_at) {
      validation.warnings.push('Vehicle already picked up');
      validation.already_used = true;
    }

    // 픽업 날짜 확인
    const now = new Date();
    const pickupDate = new Date(booking.pickup_date);
    const daysDiff = Math.floor((pickupDate - now) / (1000 * 60 * 60 * 24));

    if (daysDiff > 1) {
      validation.warnings.push(`Pickup date is ${daysDiff} days away`);
    } else if (daysDiff < -1) {
      validation.warnings.push('Pickup date has passed');
    }

    // 벤더 권한 확인 (벤더는 자기 업체 예약만)
    if (decoded.role === 'vendor' && decoded.vendorId !== booking.vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - This booking belongs to another vendor',
        vendor_id: booking.vendor_id
      });
    }

    console.log(`✅ [Verify] Voucher validated: ${voucherCode}, Valid: ${validation.is_valid}`);

    // 7. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          voucher_code: booking.voucher_code,
          status: booking.status,
          payment_status: booking.payment_status,
          pickup_checked_in_at: booking.pickup_checked_in_at,
          used_at: booking.used_at
        },
        customer: {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone
        },
        rental: {
          pickup_date: booking.pickup_date,
          pickup_time: booking.pickup_time,
          dropoff_date: booking.dropoff_date,
          dropoff_time: booking.dropoff_time,
          pickup_location: booking.pickup_location_name
        },
        vehicle: {
          vehicle_id: booking.vehicle_id,
          brand: booking.brand,
          model: booking.model,
          display_name: booking.display_name
        },
        vendor: {
          vendor_id: booking.vendor_id,
          vendor_name: booking.vendor_name
        },
        validation
      }
    });

  } catch (error) {
    console.error('❌ [Verify] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
