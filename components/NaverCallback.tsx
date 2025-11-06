import { useEffect } from 'react';

export function NaverCallback() {
  useEffect(() => {
    // URL hash에서 access_token 파싱
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const error = params.get('error');

    if (error) {
      console.error('❌ [Naver Callback] OAuth 에러:', error);
      localStorage.setItem('naver_auth_error', error);
      localStorage.setItem('naver_auth_success', 'false');
      window.close();
      return;
    }

    if (!accessToken) {
      console.error('❌ [Naver Callback] access_token 없음');
      localStorage.setItem('naver_auth_error', 'No access token');
      localStorage.setItem('naver_auth_success', 'false');
      window.close();
      return;
    }

    console.log('✅ [Naver Callback] access_token 획득');

    // Naver API로 사용자 정보 가져오기
    fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.resultcode !== '00') {
          throw new Error(data.message || '사용자 정보 가져오기 실패');
        }

        console.log('✅ [Naver Callback] 사용자 정보 획득:', data.response.email);

        const user = {
          id: data.response.id,
          email: data.response.email,
          name: data.response.name,
          picture: data.response.profile_image
        };

        // localStorage에 저장 (메인 창에서 폴링으로 읽음)
        localStorage.setItem('naver_auth_user', JSON.stringify(user));
        localStorage.setItem('naver_auth_success', 'true');

        // postMessage로도 전송 (fallback)
        if (window.opener) {
          window.opener.postMessage({
            type: 'naver-auth-success',
            user
          }, window.location.origin);
        }

        // 팝업 닫기
        setTimeout(() => {
          window.close();
        }, 500);
      })
      .catch(err => {
        console.error('❌ [Naver Callback] 사용자 정보 가져오기 실패:', err);
        localStorage.setItem('naver_auth_error', err.message);
        localStorage.setItem('naver_auth_success', 'false');
        window.close();
      });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">네이버 로그인 처리 중...</p>
      </div>
    </div>
  );
}
