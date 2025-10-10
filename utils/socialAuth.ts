// 소셜 로그인 유틸리티

// 구글 OAuth 설정
export const initGoogleAuth = () => {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;

  if (!clientId) {
    console.warn('⚠️ Google OAuth Client ID가 설정되지 않았습니다.');
    return null;
  }

  // Google OAuth2 팝업 로그인
  const loginWithGoogle = () => {
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'email profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'Google Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    return new Promise<{ email: string; name: string; id: string; picture?: string }>((resolve, reject) => {
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          reject(new Error('로그인 창이 닫혔습니다.'));
        }
      }, 1000);

      window.addEventListener('message', (event) => {
        if (event.data.type === 'google-auth-success') {
          clearInterval(checkPopup);
          popup?.close();
          resolve(event.data.user);
        } else if (event.data.type === 'google-auth-error') {
          clearInterval(checkPopup);
          popup?.close();
          reject(new Error(event.data.error));
        }
      });
    });
  };

  return { loginWithGoogle };
};

// 카카오 OAuth 설정
export const initKakaoAuth = () => {
  const appKey = import.meta.env.VITE_KAKAO_APP_KEY;

  if (!appKey) {
    console.warn('⚠️ Kakao App Key가 설정되지 않았습니다.');
    return null;
  }

  // Kakao SDK 로드
  const loadKakaoSdk = () => {
    return new Promise<void>((resolve, reject) => {
      if (window.Kakao) {
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(appKey);
        }
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://developers.kakao.com/sdk/js/kakao.js';
      script.onload = () => {
        window.Kakao.init(appKey);
        resolve();
      };
      script.onerror = () => reject(new Error('Kakao SDK 로드 실패'));
      document.head.appendChild(script);
    });
  };

  const loginWithKakao = async () => {
    await loadKakaoSdk();

    return new Promise<{ email: string; name: string; id: string; picture?: string }>((resolve, reject) => {
      window.Kakao.Auth.login({
        success: (authObj: any) => {
          window.Kakao.API.request({
            url: '/v2/user/me',
            success: (res: any) => {
              resolve({
                id: res.id.toString(),
                email: res.kakao_account?.email || '',
                name: res.kakao_account?.profile?.nickname || '카카오 사용자',
                picture: res.kakao_account?.profile?.profile_image_url
              });
            },
            fail: (error: any) => {
              reject(new Error('사용자 정보 가져오기 실패'));
            }
          });
        },
        fail: (error: any) => {
          reject(new Error('카카오 로그인 실패'));
        }
      });
    });
  };

  return { loginWithKakao };
};

// 네이버 OAuth 설정
export const initNaverAuth = () => {
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;

  if (!clientId) {
    console.warn('⚠️ Naver Client ID가 설정되지 않았습니다.');
    return null;
  }

  const loginWithNaver = () => {
    const redirectUri = `${window.location.origin}/auth/naver/callback`;
    const state = Math.random().toString(36).substring(2);
    const authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'Naver Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    return new Promise<{ email: string; name: string; id: string; picture?: string }>((resolve, reject) => {
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          reject(new Error('로그인 창이 닫혔습니다.'));
        }
      }, 1000);

      window.addEventListener('message', (event) => {
        if (event.data.type === 'naver-auth-success') {
          clearInterval(checkPopup);
          popup?.close();
          resolve(event.data.user);
        } else if (event.data.type === 'naver-auth-error') {
          clearInterval(checkPopup);
          popup?.close();
          reject(new Error(event.data.error));
        }
      });
    });
  };

  return { loginWithNaver };
};

// 타입 정의
declare global {
  interface Window {
    Kakao: any;
  }
}
