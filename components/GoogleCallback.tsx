import { useEffect } from 'react';

export function GoogleCallback() {
  useEffect(() => {
    console.log('🔵 [GoogleCallback] Started');

    // URL hash에서 access_token 추출
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    console.log('🔵 [GoogleCallback] Access token exists:', !!accessToken);

    if (accessToken) {
      // Google API로 사용자 정보 가져오기
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
        .then(res => res.json())
        .then(user => {
          console.log('✅ [GoogleCallback] User info received:', user.email);

          // localStorage에 저장 (팝업과 부모 창 간 통신)
          const userData = {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture
          };

          localStorage.setItem('google_auth_user', JSON.stringify(userData));
          localStorage.setItem('google_auth_success', 'true');

          console.log('✅ [GoogleCallback] Saved to localStorage');

          // 부모 창에도 메시지 전송 (fallback)
          if (window.opener) {
            window.opener.postMessage({
              type: 'google-auth-success',
              user: userData
            }, window.location.origin);
            console.log('✅ [GoogleCallback] Sent postMessage to opener');
          }

          // 약간의 딜레이 후 닫기
          setTimeout(() => {
            window.close();
          }, 500);
        })
        .catch(error => {
          console.error('❌ [GoogleCallback] Error:', error);
          localStorage.setItem('google_auth_error', error.message);

          if (window.opener) {
            window.opener.postMessage({
              type: 'google-auth-error',
              error: error.message
            }, window.location.origin);
          }

          setTimeout(() => {
            window.close();
          }, 500);
        });
    } else {
      const error = params.get('error');
      console.error('❌ [GoogleCallback] No access token, error:', error);
      localStorage.setItem('google_auth_error', error || 'No access token');

      if (window.opener) {
        window.opener.postMessage({
          type: 'google-auth-error',
          error: error || 'Google 인증에 실패했습니다.'
        }, window.location.origin);
      }

      setTimeout(() => {
        window.close();
      }, 500);
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #5c2d91',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p>Google 로그인 처리 중...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
