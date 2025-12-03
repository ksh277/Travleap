/**
 * SSO 토큰 생성 API
 * POST /api/sso/generate
 *
 * 다른 사이트(PINTO)로 이동할 때 SSO 토큰을 생성
 */

const jwt = require('jsonwebtoken');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');

const SSO_SECRET = process.env.SSO_SECRET || process.env.JWT_SECRET;
const SSO_EXPIRY = '5m'; // 5분 (짧게 설정)

// 허용된 타겟 사이트들
const ALLOWED_TARGETS = {
  'pinto': [
    'https://pinto-now.vercel.app',
    'https://makepinto.com',
    'http://localhost:3000'
  ],
  'travleap': [
    'https://travleap.com',
    'https://travleap.vercel.app',
    'http://localhost:5173'
  ]
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { target, redirect_path } = req.body;
    const user = req.user;

    // 타겟 사이트 검증
    if (!target || !ALLOWED_TARGETS[target]) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 타겟 사이트입니다.'
      });
    }

    // SSO 토큰 페이로드
    const payload = {
      user_id: user.userId,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      source: 'travleap',
      target: target,
      redirect_path: redirect_path || '/'
    };

    // SSO 토큰 생성
    const ssoToken = jwt.sign(payload, SSO_SECRET, { expiresIn: SSO_EXPIRY });

    // 타겟 URL 생성
    const targetBaseUrl = ALLOWED_TARGETS[target][0]; // 첫 번째 URL 사용
    const callbackUrl = `${targetBaseUrl}/sso/callback?token=${ssoToken}`;

    console.log(`✅ [SSO Generate] ${user.email} → ${target}, redirect: ${redirect_path || '/'}`);

    return res.status(200).json({
      success: true,
      data: {
        token: ssoToken,
        callback_url: callbackUrl,
        expires_in: 300 // 5분 (초)
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
