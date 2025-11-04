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
    // localStorage 클리어
    localStorage.removeItem('google_auth_user');
    localStorage.removeItem('google_auth_success');
    localStorage.removeItem('google_auth_error');

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
      let resolved = false;

      // localStorage 폴링 (500ms 간격)
      const storageCheck = setInterval(() => {
        const success = localStorage.getItem('google_auth_success');
        const error = localStorage.getItem('google_auth_error');
        const userDataStr = localStorage.getItem('google_auth_user');

        if (success === 'true' && userDataStr && !resolved) {
          resolved = true;
          clearInterval(storageCheck);
          clearInterval(checkPopup);

          const userData = JSON.parse(userDataStr);
          console.log('✅ [Google Auth] Success via localStorage:', userData.email);

          // localStorage 클리어
          localStorage.removeItem('google_auth_user');
          localStorage.removeItem('google_auth_success');
          localStorage.removeItem('google_auth_error');

          popup?.close();
          resolve(userData);
        } else if (error && !resolved) {
          resolved = true;
          clearInterval(storageCheck);
          clearInterval(checkPopup);

          console.error('❌ [Google Auth] Error via localStorage:', error);

          localStorage.removeItem('google_auth_error');
          popup?.close();
          reject(new Error(error));
        }
      }, 500);

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          clearInterval(storageCheck);

          if (!resolved) {
            resolved = true;

            // 팝업이 닫혔는데 localStorage에 데이터가 있는지 한 번 더 확인
            const userDataStr = localStorage.getItem('google_auth_user');
            if (userDataStr) {
              const userData = JSON.parse(userDataStr);
              localStorage.removeItem('google_auth_user');
              localStorage.removeItem('google_auth_success');
              resolve(userData);
            } else {
              reject(new Error('로그인 창이 닫혔습니다.'));
            }
          }
        }
      }, 1000);

      // postMessage 이벤트 리스너 (fallback)
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'google-auth-success' && !resolved) {
          resolved = true;
          clearInterval(checkPopup);
          clearInterval(storageCheck);
          window.removeEventListener('message', messageHandler);

          console.log('✅ [Google Auth] Success via postMessage:', event.data.user.email);
          popup?.close();
          resolve(event.data.user);
        } else if (event.data.type === 'google-auth-error' && !resolved) {
          resolved = true;
          clearInterval(checkPopup);
          clearInterval(storageCheck);
          window.removeEventListener('message', messageHandler);

          console.error('❌ [Google Auth] Error via postMessage:', event.data.error);
          popup?.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageHandler);
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
    // localStorage 클리어
    localStorage.removeItem('naver_auth_user');
    localStorage.removeItem('naver_auth_success');
    localStorage.removeItem('naver_auth_error');

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
      let resolved = false;

      // localStorage 폴링 (500ms 간격)
      const storageCheck = setInterval(() => {
        const success = localStorage.getItem('naver_auth_success');
        const error = localStorage.getItem('naver_auth_error');
        const userDataStr = localStorage.getItem('naver_auth_user');

        if (success === 'true' && userDataStr && !resolved) {
          resolved = true;
          clearInterval(storageCheck);
          clearInterval(checkPopup);

          const userData = JSON.parse(userDataStr);
          console.log('✅ [Naver Auth] Success via localStorage:', userData.email);

          // localStorage 클리어
          localStorage.removeItem('naver_auth_user');
          localStorage.removeItem('naver_auth_success');
          localStorage.removeItem('naver_auth_error');

          popup?.close();
          resolve(userData);
        } else if (error && !resolved) {
          resolved = true;
          clearInterval(storageCheck);
          clearInterval(checkPopup);

          console.error('❌ [Naver Auth] Error via localStorage:', error);

          localStorage.removeItem('naver_auth_error');
          popup?.close();
          reject(new Error(error));
        }
      }, 500);

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          clearInterval(storageCheck);

          if (!resolved) {
            resolved = true;

            // 팝업이 닫혔는데 localStorage에 데이터가 있는지 한 번 더 확인
            const userDataStr = localStorage.getItem('naver_auth_user');
            if (userDataStr) {
              const userData = JSON.parse(userDataStr);
              localStorage.removeItem('naver_auth_user');
              localStorage.removeItem('naver_auth_success');
              resolve(userData);
            } else {
              reject(new Error('로그인 창이 닫혔습니다.'));
            }
          }
        }
      }, 1000);

      // postMessage 이벤트 리스너 (fallback)
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'naver-auth-success' && !resolved) {
          resolved = true;
          clearInterval(checkPopup);
          clearInterval(storageCheck);
          window.removeEventListener('message', messageHandler);

          console.log('✅ [Naver Auth] Success via postMessage:', event.data.user.email);
          popup?.close();
          resolve(event.data.user);
        } else if (event.data.type === 'naver-auth-error' && !resolved) {
          resolved = true;
          clearInterval(checkPopup);
          clearInterval(storageCheck);
          window.removeEventListener('message', messageHandler);

          console.error('❌ [Naver Auth] Error via postMessage:', event.data.error);
          popup?.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageHandler);
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
