/**
 * Naver User Info Proxy
 * POST /api/auth/naver/user-info
 *
 * CORS 문제를 해결하기 위한 서버 측 프록시
 * 클라이언트가 네이버 API를 직접 호출하지 않고 이 엔드포인트를 통해 호출합니다
 */

module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // body 파싱
    let body = req.body;
    if (!body) {
      const buffer = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => { data += chunk.toString(); });
        req.on('end', () => { resolve(data); });
      });
      body = JSON.parse(buffer);
    }

    const { accessToken } = body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'accessToken is required'
      });
    }

    console.log('🔑 [Naver User Info] Fetching user info with access token...');

    // 서버에서 네이버 API 호출 (CORS 문제 없음)
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || data.resultcode !== '00') {
      console.error('❌ [Naver User Info] Failed:', data);
      return res.status(400).json({
        success: false,
        error: data.message || 'Failed to fetch user info'
      });
    }

    console.log('✅ [Naver User Info] Success:', data.response.email);

    return res.status(200).json({
      success: true,
      data: {
        id: data.response.id,
        email: data.response.email,
        name: data.response.name,
        picture: data.response.profile_image
      }
    });
  } catch (error) {
    console.error('❌ [Naver User Info] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};
