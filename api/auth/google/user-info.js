/**
 * Google User Info Proxy
 * POST /api/auth/google/user-info
 *
 * CORS 문제를 해결하기 위한 서버 측 프록시
 * 클라이언트가 Google API를 직접 호출하지 않고 이 엔드포인트를 통해 호출합니다
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

    console.log('🔑 [Google User Info] Fetching user info with access token...');

    // 서버에서 Google API 호출 (CORS 문제 없음)
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ [Google User Info] Failed:', response.status, response.statusText);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch user info'
      });
    }

    const userData = await response.json();

    console.log('✅ [Google User Info] Success:', userData.email);

    return res.status(200).json({
      success: true,
      data: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      }
    });
  } catch (error) {
    console.error('❌ [Google User Info] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};
