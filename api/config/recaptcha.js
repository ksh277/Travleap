/**
 * reCAPTCHA 사이트 키 제공 엔드포인트
 * 클라이언트에서 reCAPTCHA v3 초기화를 위해 사용
 */
module.exports = async function handler(req, res) {
  // CORS 및 Content-Type 헤더 설정
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1시간 캐시

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Vercel 런타임 환경변수에서 사이트 키 가져오기
    const siteKey = process.env.RECAPTCHA_SITE_KEY || '';

    if (!siteKey) {
      console.warn('reCAPTCHA site key not configured');
      return res.status(200).json({
        success: false,
        siteKey: null,
        message: 'reCAPTCHA not configured'
      });
    }

    console.log('reCAPTCHA site key provided:', siteKey.substring(0, 10) + '...');

    return res.status(200).json({
      success: true,
      siteKey: siteKey
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
