/**
 * Vendor Ownership Guard Middleware
 *
 * 목적:
 * - 벤더가 자신의 리소스만 접근/수정하도록 보안 강화
 * - 다른 벤더의 차량, 예약, 차단 정보 접근 차단
 * - Admin은 모든 리소스 접근 가능
 *
 * 사용법:
 * const { requireVendorOwnership } = require('../middleware/vendor-ownership-guard');
 * app.patch('/api/rentcar/vehicles/:id', requireAuth, requireVendorOwnership('vehicle'), handler);
 */

const { db } = require('../utils/database');
const { sendError } = require('../utils/rentcar-error-codes');

/**
 * 차량 소유권 확인 미들웨어
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
async function checkVehicleOwnership(req, res, next) {
  try {
    const decoded = req.user; // requireAuth에서 설정

    if (!decoded) {
      return sendError(res, 'UNAUTHORIZED');
    }

    // Admin은 모든 차량 접근 가능
    if (decoded.role === 'admin') {
      return next();
    }

    // Vendor만 체크
    if (decoded.role !== 'vendor') {
      return sendError(res, 'FORBIDDEN', {
        message: '벤더 권한이 필요합니다.'
      });
    }

    // 차량 ID 추출 (다양한 파라미터명 지원)
    const vehicleId = req.params.vehicle_id || req.params.vehicleId || req.params.id || req.query.vehicle_id;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID is required'
      });
    }

    // 차량 소유권 확인
    const vehicles = await db.query(`
      SELECT id, vendor_id
      FROM rentcar_vehicles
      WHERE id = ?
      LIMIT 1
    `, [vehicleId]);

    if (vehicles.length === 0) {
      return sendError(res, 'VEHICLE_NOT_FOUND');
    }

    const vehicle = vehicles[0];

    // 소유권 확인
    if (vehicle.vendor_id !== decoded.vendorId) {
      console.warn(`⚠️  [Ownership Guard] Vendor ${decoded.vendorId} attempted to access vehicle ${vehicleId} owned by vendor ${vehicle.vendor_id}`);

      return sendError(res, 'VENDOR_OWNERSHIP_VIOLATION', {
        resource_type: 'vehicle',
        resource_id: vehicleId,
        owner_vendor_id: vehicle.vendor_id,
        requester_vendor_id: decoded.vendorId
      });
    }

    // 소유권 확인 완료 - 다음 핸들러로 진행
    req.vehicle = vehicle; // 재사용 가능하도록 저장
    next();

  } catch (error) {
    console.error('❌ [Ownership Guard] Error checking vehicle ownership:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * 예약 소유권 확인 미들웨어
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
async function checkBookingOwnership(req, res, next) {
  try {
    const decoded = req.user;

    if (!decoded) {
      return sendError(res, 'UNAUTHORIZED');
    }

    // Admin은 모든 예약 접근 가능
    if (decoded.role === 'admin') {
      return next();
    }

    // Vendor만 체크
    if (decoded.role !== 'vendor') {
      return sendError(res, 'FORBIDDEN', {
        message: '벤더 권한이 필요합니다.'
      });
    }

    // 예약 ID 추출
    const bookingId = req.params.booking_id || req.params.bookingId || req.params.id || req.query.booking_id;
    const bookingNumber = req.params.booking_number || req.query.booking_number;

    if (!bookingId && !bookingNumber) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID or booking number is required'
      });
    }

    // 예약 정보 조회 (vendor_id 포함)
    let query = `
      SELECT id, booking_number, vendor_id
      FROM rentcar_bookings
      WHERE
    `;

    let params = [];

    if (bookingId) {
      query += ' id = ?';
      params.push(bookingId);
    } else {
      query += ' booking_number = ?';
      params.push(bookingNumber);
    }

    query += ' LIMIT 1';

    const bookings = await db.query(query, params);

    if (bookings.length === 0) {
      return sendError(res, 'BOOKING_NOT_FOUND');
    }

    const booking = bookings[0];

    // 소유권 확인
    if (booking.vendor_id !== decoded.vendorId) {
      console.warn(`⚠️  [Ownership Guard] Vendor ${decoded.vendorId} attempted to access booking ${booking.booking_number} owned by vendor ${booking.vendor_id}`);

      return sendError(res, 'VENDOR_OWNERSHIP_VIOLATION', {
        resource_type: 'booking',
        resource_id: booking.booking_number,
        owner_vendor_id: booking.vendor_id,
        requester_vendor_id: decoded.vendorId
      });
    }

    // 소유권 확인 완료
    req.booking = booking; // 재사용 가능하도록 저장
    next();

  } catch (error) {
    console.error('❌ [Ownership Guard] Error checking booking ownership:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * 차량 차단 소유권 확인 미들웨어
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
async function checkBlockOwnership(req, res, next) {
  try {
    const decoded = req.user;

    if (!decoded) {
      return sendError(res, 'UNAUTHORIZED');
    }

    // Admin은 모든 차단 접근 가능
    if (decoded.role === 'admin') {
      return next();
    }

    // Vendor만 체크
    if (decoded.role !== 'vendor') {
      return sendError(res, 'FORBIDDEN', {
        message: '벤더 권한이 필요합니다.'
      });
    }

    // 차량 ID 추출
    const vehicleId = req.params.vehicle_id || req.params.vehicleId || req.query.vehicle_id;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID is required'
      });
    }

    // 차량의 vendor_id 확인
    const vehicles = await db.query(`
      SELECT id, vendor_id
      FROM rentcar_vehicles
      WHERE id = ?
      LIMIT 1
    `, [vehicleId]);

    if (vehicles.length === 0) {
      return sendError(res, 'VEHICLE_NOT_FOUND');
    }

    const vehicle = vehicles[0];

    // 소유권 확인
    if (vehicle.vendor_id !== decoded.vendorId) {
      console.warn(`⚠️  [Ownership Guard] Vendor ${decoded.vendorId} attempted to access block for vehicle ${vehicleId} owned by vendor ${vehicle.vendor_id}`);

      return sendError(res, 'VENDOR_OWNERSHIP_VIOLATION', {
        resource_type: 'vehicle_block',
        resource_id: vehicleId,
        owner_vendor_id: vehicle.vendor_id,
        requester_vendor_id: decoded.vendorId
      });
    }

    // 소유권 확인 완료
    req.vehicle = vehicle;
    next();

  } catch (error) {
    console.error('❌ [Ownership Guard] Error checking block ownership:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * 리소스 타입별 소유권 확인 미들웨어 팩토리
 *
 * @param {string} resourceType - 'vehicle' | 'booking' | 'block'
 * @returns {Function} Express middleware
 */
function requireVendorOwnership(resourceType) {
  switch (resourceType) {
    case 'vehicle':
      return checkVehicleOwnership;
    case 'booking':
      return checkBookingOwnership;
    case 'block':
      return checkBlockOwnership;
    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }
}

module.exports = {
  requireVendorOwnership,
  checkVehicleOwnership,
  checkBookingOwnership,
  checkBlockOwnership
};
