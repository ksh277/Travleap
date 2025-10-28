import { useEffect } from 'react';

export function GoogleCallback() {
  useEffect(() => {
    // URL hash에서 access_token 추출
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
      // Google API로 사용자 정보 가져오기
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
        .then(res => res.json())
        .then(user => {
          // 부모 창에 성공 메시지 전송
          if (window.opener) {
            window.opener.postMessage({
              type: 'google-auth-success',
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture
              }
            }, window.location.origin);
          }
          window.close();
        })
        .catch(error => {
          // 부모 창에 에러 메시지 전송
          if (window.opener) {
            window.opener.postMessage({
              type: 'google-auth-error',
              error: error.message
            }, window.location.origin);
          }
          window.close();
        });
    } else {
      const error = params.get('error');
      if (window.opener) {
        window.opener.postMessage({
          type: 'google-auth-error',
          error: error || 'Google 인증에 실패했습니다.'
        }, window.location.origin);
      }
      window.close();
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
