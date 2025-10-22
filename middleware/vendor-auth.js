const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 벤더 인증 및 권한 확인 미들웨어
 *
 * JWT 토큰에서 사용자 정보를 추출하고,
 * 해당 사용자가 실제 벤더인지 확인하며,
 * 요청한 리소스에 대한 접근 권한이 있는지 검증합니다.
 *
 * 보안 원칙:
 * - JWT 토큰만 신뢰 (헤더/쿼리의 vendorId는 무시)
 * - 토큰에서 추출한 userId로 rentcar_vendors 테이블에서 vendor_id 조회
 * - 조회한 vendor_id를 req.vendorId에 저장
 * - 다른 업체의 데이터 접근 차단
 */
async function verifyVendorAuth(req, res) {
  try {
    // 1. Authorization 헤더 확인
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        status: 401,
        message: '인증 토큰이 필요합니다. 로그인 후 다시 시도해주세요.'
      };
    }

    // 2. 토큰 추출
    const token = authHeader.substring(7);

    if (!token || token === 'null' || token === 'undefined') {
      return {
        success: false,
        status: 401,
        message: '유효하지 않은 토큰입니다.'
      };
    }

    // 3. JWT 검증
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'travleap-secret-key-2024');
    } catch (error) {
      console.error('JWT 검증 실패:', error.message);
      return {
        success: false,
        status: 401,
        message: '토큰이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.'
      };
    }

    // 4. 사용자 역할 확인
    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return {
        success: false,
        status: 403,
        message: '벤더 권한이 필요합니다.'
      };
    }

    // 5. 관리자는 모든 리소스 접근 가능
    if (decoded.role === 'admin') {
      // 관리자는 특정 vendorId를 쿼리에서 받을 수 있음
      const requestedVendorId = req.query.vendorId || req.body?.vendorId || req.headers['x-vendor-id'];

      return {
        success: true,
        userId: decoded.userId,
        email: decoded.email,
        role: 'admin',
        vendorId: requestedVendorId ? parseInt(requestedVendorId) : null,
        isAdmin: true
      };
    }

    // 6. 벤더인 경우: userId로 vendor_id 조회
    const connection = connect({ url: process.env.DATABASE_URL });

    const vendorResult = await connection.execute(
      'SELECT id, business_name, status FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
      [decoded.userId]
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      return {
        success: false,
        status: 403,
        message: '등록된 벤더 정보가 없습니다. 관리자에게 문의하세요.'
      };
    }

    const vendor = vendorResult.rows[0];

    // 7. 벤더 상태 확인
    if (vendor.status !== 'active') {
      return {
        success: false,
        status: 403,
        message: '비활성화된 벤더 계정입니다. 관리자에게 문의하세요.'
      };
    }

    // 8. 인증 성공
    return {
      success: true,
      userId: decoded.userId,
      email: decoded.email,
      role: 'vendor',
      vendorId: vendor.id,
      vendorName: vendor.business_name,
      isAdmin: false
    };

  } catch (error) {
    console.error('❌ [Vendor Auth] 인증 오류:', error);
    return {
      success: false,
      status: 500,
      message: '인증 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * Express/Vercel 미들웨어 래퍼
 *
 * 사용법:
 * module.exports = async function handler(req, res) {
 *   const auth = await requireVendorAuth(req, res);
 *   if (!auth.success) return; // 이미 res.status().json() 호출됨
 *
 *   // auth.vendorId 사용
 *   const vehicles = await getVehicles(auth.vendorId);
 * }
 */
async function requireVendorAuth(req, res) {
  const result = await verifyVendorAuth(req, res);

  if (!result.success) {
    return res.status(result.status).json({
      success: false,
      message: result.message
    });
  }

  // req 객체에 인증 정보 저장
  req.vendorAuth = result;
  req.vendorId = result.vendorId;
  req.userId = result.userId;
  req.isAdmin = result.isAdmin;

  return result;
}

/**
 * 특정 리소스의 소유권 확인
 *
 * 사용법:
 * const auth = await requireVendorAuth(req, res);
 * if (!auth.success) return;
 *
 * const vehicleId = req.params.id;
 * const ownershipCheck = await requireResourceOwnership(req, res, 'vehicle', vehicleId);
 * if (!ownershipCheck.success) return;
 */
async function requireResourceOwnership(req, res, resourceType, resourceId) {
  try {
    // 관리자는 모든 리소스 접근 가능
    if (req.isAdmin) {
      return { success: true };
    }

    const connection = connect({ url: process.env.DATABASE_URL });
    let query, params;

    switch (resourceType) {
      case 'vehicle':
        query = 'SELECT vendor_id FROM rentcar_vehicles WHERE id = ?';
        params = [resourceId];
        break;

      case 'booking':
        query = 'SELECT vendor_id FROM rentcar_bookings WHERE id = ?';
        params = [resourceId];
        break;

      default:
        return {
          success: false,
          status: 400,
          message: '지원하지 않는 리소스 유형입니다.'
        };
    }

    const result = await connection.execute(query, params);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '리소스를 찾을 수 없습니다.'
      });
    }

    const resourceVendorId = result.rows[0].vendor_id;

    if (resourceVendorId !== req.vendorId) {
      return res.status(403).json({
        success: false,
        message: '이 리소스에 대한 접근 권한이 없습니다.'
      });
    }

    return { success: true };

  } catch (error) {
    console.error('❌ [Resource Ownership] 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '권한 확인 중 오류가 발생했습니다.'
    });
  }
}

module.exports = {
  verifyVendorAuth,
  requireVendorAuth,
  requireResourceOwnership
};
