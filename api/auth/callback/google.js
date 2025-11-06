/**
 * Google OAuth Callback
 * GET /api/auth/callback/google
 */

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // URL fragment(#)는 서버에서 접근 불가능하므로, 클라이언트에서 처리하도록 HTML 반환
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Google 로그인 처리 중...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #8B5FBF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h2 { color: #333; margin: 0 0 10px; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Google 로그인 처리 중...</h2>
    <p>잠시만 기다려주세요</p>
  </div>
  <script>
    (async function() {
      try {
        // URL fragment에서 access_token 추출
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const error = params.get('error');

        if (error) {
          console.error('❌ [Google Callback] OAuth 에러:', error);
          localStorage.setItem('google_auth_error', error);
          localStorage.setItem('google_auth_success', 'false');
          window.close();
          return;
        }

        if (!accessToken) {
          console.error('❌ [Google Callback] access_token 없음');
          localStorage.setItem('google_auth_error', 'No access token');
          localStorage.setItem('google_auth_success', 'false');
          window.close();
          return;
        }

        console.log('✅ [Google Callback] access_token 획득');

        // Google API로 사용자 정보 가져오기
        const response = await fetch(\`https://www.googleapis.com/oauth2/v2/userinfo?access_token=\${accessToken}\`);
        const userData = await response.json();

        console.log('✅ [Google Callback] 사용자 정보 획득:', userData.email);

        const user = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture
        };

        // localStorage에 저장
        localStorage.setItem('google_auth_user', JSON.stringify(user));
        localStorage.setItem('google_auth_success', 'true');

        // postMessage로 전송
        if (window.opener) {
          window.opener.postMessage({
            type: 'google-auth-success',
            user
          }, window.location.origin);
        }

        // 팝업 닫기
        setTimeout(() => {
          window.close();
        }, 500);
      } catch (err) {
        console.error('❌ [Google Callback] 처리 실패:', err);
        localStorage.setItem('google_auth_error', err.message);
        localStorage.setItem('google_auth_success', 'false');
        window.close();
      }
    })();
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('❌ [Google Callback] Error:', error);
    return res.status(500).send('Server Error');
  }
};
