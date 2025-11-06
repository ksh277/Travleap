import { useEffect } from 'react';

export function GoogleCallback() {
  useEffect(() => {
    // URL hash에서 access_token 파싱
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
    fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`)
      .then(res => res.json())
      .then(userData => {
        console.log('✅ [Google Callback] 사용자 정보 획득:', userData.email);

        const user = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture
        };

        // localStorage에 저장 (메인 창에서 폴링으로 읽음)
        localStorage.setItem('google_auth_user', JSON.stringify(user));
        localStorage.setItem('google_auth_success', 'true');

        // postMessage로도 전송 (fallback)
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
      })
      .catch(err => {
        console.error('❌ [Google Callback] 사용자 정보 가져오기 실패:', err);
        localStorage.setItem('google_auth_error', err.message);
        localStorage.setItem('google_auth_success', 'false');
        window.close();
      });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5FBF] mx-auto mb-4"></div>
        <p className="text-gray-600">Google 로그인 처리 중...</p>
      </div>
    </div>
  );
}
