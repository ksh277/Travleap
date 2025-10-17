/**
 * CORS 유틸리티
 *
 * 보안을 위해 허용된 도메인만 CORS 접근 가능하도록 설정
 */

import { Response } from 'express';

// 허용된 도메인 목록
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
  : [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000',  // Next.js
      'http://localhost:3004',  // API server
    ];

/**
 * CORS 헤더 설정
 *
 * @param res Express Response 객체
 * @param origin 요청의 Origin 헤더 (req.headers.origin)
 */
export function setCorsHeaders(res: Response, origin?: string): void {
  // Origin이 허용 목록에 있으면 설정
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (ALLOWED_ORIGINS.length > 0 && !origin) {
    // Origin 헤더가 없으면 첫 번째 허용 도메인 사용
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  // 허용되지 않은 origin은 헤더를 설정하지 않음 (브라우저가 차단)

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * CORS 헤더 객체 반환 (NextResponse용)
 *
 * @param origin 요청의 Origin 헤더
 * @returns CORS 헤더 객체
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0] || 'http://localhost:5173';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * 보안 헤더 설정 (추가)
 *
 * XSS, Clickjacking 등 방어
 */
export function setSecurityHeaders(res: Response): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content-Security-Policy (필요시 조정)
  res.setHeader('Content-Security-Policy', "default-src 'self'");
}

/**
 * CORS + Security 헤더 한번에 설정
 */
export function setAllSecurityHeaders(res: Response, origin?: string): void {
  setCorsHeaders(res, origin);
  setSecurityHeaders(res);
}
