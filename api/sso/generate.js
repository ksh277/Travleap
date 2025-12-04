/**
 * SSO 토큰 생성 API
 * POST /api/sso/generate
 *
 * 다른 사이트(PINTO)로 이동할 때 SSO 토큰을 생성
 * jose 라이브러리 사용 (PINTO와 호환) - ESM dynamic import
 */

const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');

const SSO_EXPIRY = 5 * 60; // 5분 (초)

// 허용된 타겟 사이트들
const ALLOWED_TARGETS = {
  'pinto': [
    'https://makepinto.com',
    'https://pinto-now.vercel.app',
    'http://localhost:3000'
  ],
  'travleap': [
    'https://travleap.com',
    'https://www.travleap.com',
    'https://travleap.vercel.app',
    'http://localhost:5173'
  ]
};

// SSO Secret을 Uint8Array로 변환 (jose 라이브러리 요구사항)
function getSSOSecret() {
  const secret = process.env.SSO_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('SSO_SECRET 환경변수가 설정되지 않았습니다.');
  }
  return new TextEncoder().encode(secret);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // ESM dynamic import for jose
    const { SignJWT } = await import('jose');

    const { target, redirect_path } = req.body;
    const user = req.user;

    // 타겟 사이트 검증
    if (!target || !ALLOWED_TARGETS[target]) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 타겟 사이트입니다.'
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // SSO 토큰 생성 (jose 라이브러리 사용)
    const ssoToken = await new SignJWT({
      user_id: user.userId,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      source: 'travleap',
      target: target,
      redirect_path: redirect_path || '/'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + SSO_EXPIRY)
      .sign(getSSOSecret());

    // 타겟 URL 생성
    const targetBaseUrl = ALLOWED_TARGETS[target][0]; // 첫 번째 URL 사용
    const callbackUrl = `${targetBaseUrl}/sso/callback?token=${ssoToken}`;

    console.log(`✅ [SSO Generate] ${user.email} → ${target}, redirect: ${redirect_path || '/'}`);

    return res.status(200).json({
      success: true,
      data: {
        token: ssoToken,
        callback_url: callbackUrl,
        expires_in: SSO_EXPIRY
      }
    });

  } catch (error) {
    console.error('❌ [SSO Generate] Error:', error);
    return res.status(500).json({
      success: false,
      error: '토큰 생성 중 오류가 발생했습니다.'
    });
  }
}

module.exports = withSecureCors(withAuth(handler, { requireAuth: true }));
