/**
 * reCAPTCHA v3 검증 유틸리티
 * 서버 사이드에서 reCAPTCHA 토큰을 검증하는 함수
 */

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * reCAPTCHA 토큰 검증
 * @param {string} token - 클라이언트에서 받은 reCAPTCHA 토큰
 * @param {string} expectedAction - 예상되는 액션 (예: 'login', 'signup')
 * @param {number} minScore - 최소 허용 점수 (기본: 0.5)
 * @returns {Promise<{success: boolean, score?: number, action?: string, error?: string}>}
 */
async function verifyRecaptcha(token, expectedAction = null, minScore = 0.5) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  // 시크릿 키가 없으면 검증 건너뛰기 (개발 환경 또는 미설정 시)
  if (!secretKey) {
    console.warn('reCAPTCHA secret key not configured. Skipping verification.');
    return { success: true, skipped: true };
  }

  // 토큰이 없으면 실패
  if (!token) {
    return { success: false, error: 'reCAPTCHA 토큰이 없습니다.' };
  }

  try {
    // Google reCAPTCHA API에 검증 요청
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();

    // 기본 검증 실패
    if (!data.success) {
      console.error('reCAPTCHA verification failed:', data['error-codes']);
      return {
        success: false,
        error: 'reCAPTCHA 검증에 실패했습니다.',
        errorCodes: data['error-codes'],
      };
    }

    // 점수 확인 (v3에서는 0.0 ~ 1.0 점수 반환)
    const score = data.score || 0;
    if (score < minScore) {
      console.warn(`reCAPTCHA score too low: ${score} (min: ${minScore})`);
      return {
        success: false,
        score,
        error: '보안 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      };
    }

    // 액션 확인 (옵션)
    if (expectedAction && data.action !== expectedAction) {
      console.warn(`reCAPTCHA action mismatch: expected ${expectedAction}, got ${data.action}`);
      return {
        success: false,
        action: data.action,
        error: '보안 검증에 실패했습니다.',
      };
    }

    return {
      success: true,
      score,
      action: data.action,
      hostname: data.hostname,
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return {
      success: false,
      error: 'reCAPTCHA 검증 중 오류가 발생했습니다.',
    };
  }
}

/**
 * reCAPTCHA 검증 미들웨어 (선택적)
 * API 핸들러에서 사용할 수 있는 헬퍼 함수
 */
async function requireRecaptcha(req, res, expectedAction = null, minScore = 0.5) {
  const token = req.body?.recaptchaToken || req.headers['x-recaptcha-token'];

  const result = await verifyRecaptcha(token, expectedAction, minScore);

  if (!result.success && !result.skipped) {
    res.status(403).json({
      success: false,
      error: result.error || '보안 검증에 실패했습니다.',
    });
    return false;
  }

  return true;
}

module.exports = {
  verifyRecaptcha,
  requireRecaptcha,
};
