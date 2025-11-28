/**
 * JWT 인증 미들웨어
 * 3단계 권한 구조:
 * - SUPER_ADMIN: 최고관리자 (어썸 본사) - 모든 권한
 * - MD_ADMIN: MD 관리자 - 운영 실무 (가맹점 승인, 쿠폰 관리, 광고 관리 등)
 * - PARTNER: 입점자(가맹점 사장) - 자기 가게 관리, 쿠폰 사용 처리
 * - VENDOR: 벤더 (쿠폰 시스템과 무관, 카테고리별 업체)
 * - USER: 일반 사용자
 */

const jwt = require('jsonwebtoken');
const { connect } = require('@planetscale/database');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 환경변수가 설정되지 않았습니다!');
}

/**
 * 역할(Role) 정의
 */
const ROLES = {
  SUPER_ADMIN: 'super_admin',  // 최고관리자 (어썸)
  MD_ADMIN: 'md_admin',        // MD 관리자
  ADMIN: 'admin',              // 기존 admin (SUPER_ADMIN과 동일하게 처리)
  PARTNER: 'partner',          // 입점자 (가맹점 사장)
  VENDOR: 'vendor',            // 벤더 (카테고리별 업체)
  USER: 'user'                 // 일반 사용자
};

/**
 * 권한 체크 헬퍼 함수들
 */
const permissions = {
  // 최고관리자인가? (admin 또는 super_admin)
  isSuperAdmin: (role) => ['super_admin', 'admin'].includes(role),

  // MD 관리자 이상인가?
  isMDAdminOrAbove: (role) => ['super_admin', 'admin', 'md_admin'].includes(role),

  // 파트너인가?
  isPartner: (role) => role === 'partner',

  // 벤더인가?
  isVendor: (role) => role === 'vendor',

  // 관리자 레벨인가? (MD 이상)
  isAdminLevel: (role) => ['super_admin', 'admin', 'md_admin'].includes(role),

  // 특정 권한 체크
  canManagePartners: (role) => ['super_admin', 'admin', 'md_admin'].includes(role),
  canApproveCoupons: (role) => ['super_admin', 'admin', 'md_admin'].includes(role),
  canManageAds: (role) => ['super_admin', 'admin', 'md_admin'].includes(role),
  canManagePayments: (role) => ['super_admin', 'admin'].includes(role),  // 결제는 최고관리자만
  canManageSystem: (role) => ['super_admin', 'admin'].includes(role),    // 시스템 설정은 최고관리자만
  canViewAllStats: (role) => ['super_admin', 'admin', 'md_admin'].includes(role),
  canUseCouponScanner: (role) => role === 'partner',  // 쿠폰 스캐너는 파트너만
};

/**
 * Authorization 헤더에서 JWT 토큰 추출 및 검증
 * @param {Request} req - HTTP 요청 객체
 * @returns {Object|null} { userId, email, name, role } 또는 null
 */
function verifyJWTFromRequest(req) {
  try {
    // 1. Authorization 헤더 확인
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      console.warn('⚠️ [Auth] Authorization 헤더 없음');
      return null;
    }

    // 2. Bearer 토큰 추출
    let token = null;
    if (typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = authHeader;
      }
    }

    if (!token) {
      console.warn('⚠️ [Auth] 토큰 추출 실패');
      return null;
    }

    // 3. JWT 검증
    const decoded = jwt.verify(token, JWT_SECRET);

    console.log(`✅ [Auth] JWT 검증 성공: userId=${decoded.userId}, role=${decoded.role}`);

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.error('❌ [Auth] JWT 만료:', error.message);
    } else if (error.name === 'JsonWebTokenError') {
      console.error('❌ [Auth] JWT 검증 실패:', error.message);
    } else {
      console.error('❌ [Auth] JWT 처리 중 오류:', error);
    }
    return null;
  }
}

/**
 * API 핸들러를 JWT 인증으로 보호
 * @param {Function} handler - 원본 API 핸들러
 * @param {Object} options - {
 *   requireAuth: true,           // 인증 필수 여부
 *   requireAdmin: false,         // (레거시) admin 역할 필요 여부
 *   requireSuperAdmin: false,    // SUPER_ADMIN (최고관리자) 필요
 *   requireMDAdmin: false,       // MD_ADMIN 이상 필요
 *   requirePartner: false,       // PARTNER 역할 필요
 *   allowedRoles: ['user']       // 허용된 역할 배열
 * }
 * @returns {Function} 인증이 추가된 핸들러
 */
function withAuth(handler, options = {}) {
  const {
    requireAuth = true,
    requireAdmin = false,
    requireSuperAdmin = false,
    requireMDAdmin = false,
    requirePartner = false,
    allowedRoles = null
  } = options;

  return async function (req, res) {
    // JWT 검증
    const user = verifyJWTFromRequest(req);

    // 인증 필수인데 실패한 경우
    if (requireAuth && !user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.'
      });
    }

    // requireAdmin 옵션 체크 (레거시 - SUPER_ADMIN 동일 처리)
    if (requireAdmin && (!user || !permissions.isSuperAdmin(user.role))) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: '관리자 권한이 필요합니다.'
      });
    }

    // SUPER_ADMIN (최고관리자) 권한 체크
    if (requireSuperAdmin && (!user || !permissions.isSuperAdmin(user.role))) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: '최고관리자 권한이 필요합니다.'
      });
    }

    // MD_ADMIN 이상 권한 체크
    if (requireMDAdmin && (!user || !permissions.isMDAdminOrAbove(user.role))) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'MD 관리자 이상 권한이 필요합니다.'
      });
    }

    // PARTNER 권한 체크
    if (requirePartner && (!user || !permissions.isPartner(user.role))) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: '파트너 권한이 필요합니다.'
      });
    }

    // 역할 확인 (allowedRoles 옵션)
    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: '접근 권한이 없습니다.'
      });
    }

    // req에 user 정보 추가
    req.user = user;

    // 파트너 계정인 경우 partnerId 조회
    if (user && user.role === 'partner') {
      try {
        const connection = connect({ url: process.env.DATABASE_URL });
        const partnerResult = await connection.execute(
          'SELECT id FROM partners WHERE user_id = ? AND status = "approved" LIMIT 1',
          [user.userId]
        );

        if (partnerResult.rows && partnerResult.rows.length > 0) {
          req.user.partnerId = partnerResult.rows[0].id;
          console.log(`✅ [Auth] 파트너 ID 조회 성공: partnerId=${req.user.partnerId}`);
        } else {
          console.warn(`⚠️ [Auth] 파트너 정보 없음: userId=${user.userId}`);
          req.user.partnerId = null;
        }
      } catch (partnerError) {
        console.error('❌ [Auth] 파트너 ID 조회 실패:', partnerError.message);
        req.user.partnerId = null;
      }
    }

    // 원본 핸들러 실행
    return handler(req, res);
  };
}

/**
 * 사용자 ID 추출 (하위 호환성 유지)
 * @param {Request} req
 * @returns {number|null}
 */
function getUserIdFromRequest(req) {
  const user = req.user || verifyJWTFromRequest(req);
  return user ? user.userId : null;
}

module.exports = {
  verifyJWTFromRequest,
  withAuth,
  getUserIdFromRequest,
  ROLES,
  permissions
};
