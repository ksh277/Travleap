/**
 * JWT 인증 미들웨어
 * x-user-id 헤더를 JWT 인증으로 대체
 *
 * 파트너 계정인 경우 partnerId도 함께 반환
 */

const jwt = require('jsonwebtoken');
const { connect } = require('@planetscale/database');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 환경변수가 설정되지 않았습니다!');
}

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
 * @param {Object} options - { requireAuth: true, requireAdmin: false, allowedRoles: ['user', 'admin'] }
 * @returns {Function} 인증이 추가된 핸들러
 */
function withAuth(handler, options = {}) {
  const { requireAuth = true, requireAdmin = false, allowedRoles = null } = options;

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

    // requireAdmin 옵션 체크
    if (requireAdmin && (!user || user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: '관리자 권한이 필요합니다.'
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
  getUserIdFromRequest
};
