/**
 * Authentication Middleware
 *
 * JWT 토큰을 검증하여 API 엔드포인트를 보호합니다.
 *
 * 사용법:
 * app.get('/api/protected', authenticate, (req, res) => { ... })
 * app.get('/api/admin-only', authenticate, requireRole('admin'), (req, res) => { ... })
 */

import { Request, Response, NextFunction } from 'express';
import { JWTUtils, JWTPayload } from '../utils/jwt.js';

// Express Request에 user 속성 추가
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT 인증 미들웨어
 *
 * Authorization 헤더에서 JWT 토큰을 추출하여 검증합니다.
 *
 * 헤더 형식: Authorization: Bearer <token>
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // 1. Authorization 헤더 확인
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다. Authorization 헤더가 없습니다.'
      });
      return;
    }

    // 2. Bearer 토큰 형식 확인
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: '잘못된 인증 형식입니다. "Bearer <token>" 형식을 사용하세요.'
      });
      return;
    }

    // 3. 토큰 추출
    const token = authHeader.substring(7); // "Bearer " 제거

    if (!token || token === 'null' || token === 'undefined') {
      res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
      return;
    }

    // 4. JWT 검증
    const payload = JWTUtils.verifyToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: '토큰이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.'
      });
      return;
    }

    // 5. 사용자 정보를 req.user에 저장
    req.user = payload;

    // 6. 다음 미들웨어로 진행
    next();

  } catch (error) {
    console.error('❌ 인증 미들웨어 오류:', error);
    res.status(500).json({
      success: false,
      message: '인증 처리 중 오류가 발생했습니다.'
    });
  }
}

/**
 * 역할 기반 접근 제어 미들웨어
 *
 * authenticate 미들웨어 이후에 사용해야 합니다.
 *
 * 사용법:
 * app.get('/api/admin', authenticate, requireRole('admin'), (req, res) => { ... })
 * app.get('/api/vendor', authenticate, requireRole(['vendor', 'admin']), (req, res) => { ... })
 */
export function requireRole(roles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // 1. authenticate 미들웨어가 실행되었는지 확인
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다. authenticate 미들웨어를 먼저 적용하세요.'
        });
        return;
      }

      // 2. 역할 배열로 변환
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      // 3. 사용자 역할 확인
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: `접근 권한이 없습니다. 필요한 역할: ${allowedRoles.join(', ')}`
        });
        return;
      }

      // 4. 권한 확인 완료
      next();

    } catch (error) {
      console.error('❌ 역할 확인 오류:', error);
      res.status(500).json({
        success: false,
        message: '권한 확인 중 오류가 발생했습니다.'
      });
    }
  };
}

/**
 * Optional 인증 미들웨어
 *
 * 토큰이 있으면 검증하고 req.user를 설정하지만,
 * 없어도 계속 진행합니다.
 *
 * 로그인한 사용자와 비로그인 사용자 모두 접근 가능하지만,
 * 로그인한 경우 추가 기능을 제공하는 엔드포인트에 사용합니다.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    // 토큰이 없으면 그냥 진행
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    // 토큰이 없으면 그냥 진행
    if (!token || token === 'null' || token === 'undefined') {
      next();
      return;
    }

    // 토큰이 있으면 검증 시도
    const payload = JWTUtils.verifyToken(token);

    if (payload) {
      req.user = payload;
    }

    // 검증 실패해도 계속 진행
    next();

  } catch (error) {
    console.error('❌ Optional 인증 오류:', error);
    // 에러가 발생해도 계속 진행
    next();
  }
}

/**
 * 본인 확인 미들웨어
 *
 * URL 파라미터나 body의 userId가 현재 로그인한 사용자의 userId와 일치하는지 확인
 * 관리자는 모든 사용자 접근 가능
 *
 * 사용법:
 * app.get('/api/users/:userId/profile', authenticate, requireSelf, (req, res) => { ... })
 */
export function requireSelf(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '인증이 필요합니다.'
      });
      return;
    }

    // 관리자는 모든 사용자 접근 가능
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // URL 파라미터에서 userId 확인
    const targetUserId = parseInt(req.params.userId || req.body.userId);

    if (isNaN(targetUserId)) {
      res.status(400).json({
        success: false,
        message: 'userId가 유효하지 않습니다.'
      });
      return;
    }

    // 본인 확인
    if (req.user.userId !== targetUserId) {
      res.status(403).json({
        success: false,
        message: '본인의 정보만 접근할 수 있습니다.'
      });
      return;
    }

    next();

  } catch (error) {
    console.error('❌ 본인 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '본인 확인 중 오류가 발생했습니다.'
    });
  }
}

/**
 * API 키 인증 미들웨어
 *
 * X-API-Key 헤더로 외부 시스템 인증
 *
 * 사용법:
 * app.post('/api/webhooks/pms', authenticateApiKey, (req, res) => { ... })
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      res.status(401).json({
        success: false,
        message: 'API 키가 필요합니다. X-API-Key 헤더를 제공하세요.'
      });
      return;
    }

    // API 키 검증 (환경변수와 비교)
    const validApiKeys = [
      process.env.PMS_API_KEY,
      process.env.INTERNAL_API_KEY
    ].filter(Boolean);

    if (!validApiKeys.includes(apiKey as string)) {
      res.status(401).json({
        success: false,
        message: '유효하지 않은 API 키입니다.'
      });
      return;
    }

    next();

  } catch (error) {
    console.error('❌ API 키 인증 오류:', error);
    res.status(500).json({
      success: false,
      message: 'API 키 인증 중 오류가 발생했습니다.'
    });
  }
}
