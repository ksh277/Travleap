import { useEffect } from 'react';

export function NaverCallback() {
  useEffect(() => {
    console.log('🟢 [NaverCallback] Started');

    // URL hash에서 access_token 추출
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    console.log('🟢 [NaverCallback] Access token exists:', !!accessToken);

    if (accessToken) {
      // 네이버 API로 사용자 정보 가져오기
      fetch('https://openapi.naver.com/v1/nid/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.resultcode === '00' && data.response) {
            const naverUser = data.response;
            console.log('✅ [NaverCallback] User info received:', naverUser.email);

            // localStorage에 저장 (팝업과 부모 창 간 통신)
            const userData = {
              id: naverUser.id,
              email: naverUser.email,
              name: naverUser.nickname || naverUser.name || '네이버 사용자',
              picture: naverUser.profile_image
            };

            localStorage.setItem('naver_auth_user', JSON.stringify(userData));
            localStorage.setItem('naver_auth_success', 'true');

            console.log('✅ [NaverCallback] Saved to localStorage');

            // 부모 창에도 메시지 전송
            if (window.opener) {
              window.opener.postMessage({
                type: 'naver-auth-success',
                user: userData
              }, window.location.origin);
              console.log('✅ [NaverCallback] Sent postMessage to opener');
            }

            // 약간의 딜레이 후 닫기
            setTimeout(() => {
              window.close();
            }, 500);
          } else {
            throw new Error(data.message || '네이버 사용자 정보 조회 실패');
          }
        })
        .catch(error => {
          console.error('❌ [NaverCallback] Error:', error);
          localStorage.setItem('naver_auth_error', error.message);

          if (window.opener) {
            window.opener.postMessage({
              type: 'naver-auth-error',
              error: error.message
            }, window.location.origin);
          }

          setTimeout(() => {
            window.close();
          }, 500);
        });
    } else {
      const error = params.get('error');
      const errorDesc = params.get('error_description');
      console.error('❌ [NaverCallback] No access token, error:', error, errorDesc);
      localStorage.setItem('naver_auth_error', errorDesc || error || 'No access token');

      if (window.opener) {
        window.opener.postMessage({
          type: 'naver-auth-error',
          error: errorDesc || error || '네이버 인증에 실패했습니다.'
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
        borderTop: '5px solid #03C75A',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p>네이버 로그인 처리 중...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
