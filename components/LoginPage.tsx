import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { initGoogleAuth, initKakaoAuth, initNaverAuth } from '../utils/socialAuth';
import { usePageBanner } from '../hooks/usePageBanner';
import { useRecaptcha } from '../hooks/useRecaptcha';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAdmin, isMDAdmin, user } = useAuth();
  const { isReady: isRecaptchaReady, executeRecaptcha } = useRecaptcha();

  // returnUrl 파라미터 가져오기 (QR 스캔 등에서 쿠폰 코드 유지용)
  const returnUrl = searchParams.get('returnUrl');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const bannerImage = usePageBanner('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('🔑 로그인 시도:', email);

    try {
      // reCAPTCHA 토큰 생성
      let recaptchaToken: string | null = null;
      if (isRecaptchaReady) {
        recaptchaToken = await executeRecaptcha('login');
        console.log('🔐 reCAPTCHA 토큰 생성:', recaptchaToken ? '성공' : '실패');
      }

      const success = await login(email, password, recaptchaToken);

      console.log('✅ 로그인 결과:', success);

      if (success) {
        toast.success('로그인 성공!');

        // 모바일 환경 감지
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('📱 모바일 환경:', isMobile);

        // 세션 저장 확인 (모바일에서 중요)
        const tokenCheck = localStorage.getItem('auth_token');
        console.log('🔐 토큰 저장 확인:', tokenCheck ? '✅ 저장됨' : '❌ 저장 안됨');

        if (!tokenCheck) {
          console.error('❌ 토큰 저장 실패 - 세션 복원 불가능');
          toast.error('로그인 정보 저장 실패. 브라우저 설정을 확인해주세요.');
          setIsLoading(false);
          return;
        }

        // 약간의 딜레이 후 리다이렉트 (상태 업데이트 대기)
        setTimeout(() => {
          // returnUrl이 있으면 해당 URL로 이동 (QR 스캔 등)
          if (returnUrl) {
            console.log('🔗 returnUrl로 이동:', returnUrl);
            navigate(returnUrl, { replace: true });
            return;
          }

          if (isMDAdmin) {
            // 관리자 또는 MD관리자는 모두 /admin으로
            console.log('🔑 관리자(MD 이상)로 이동');
            navigate('/admin', { replace: true });
          } else if (user?.role === 'partner') {
            console.log('🏨 파트너 대시보드로 이동');
            navigate('/partner/dashboard', { replace: true });
          } else if (user?.role === 'vendor') {
            // 벤더 타입에 따라 다른 대시보드로 이동
            if (user.vendorType === 'stay') {
              console.log('🏨 숙박 벤더 대시보드로 이동');
              navigate('/vendor/lodging', { replace: true });
            } else if (user.vendorType === 'rental') {
              console.log('🚗 렌트카 벤더 대시보드로 이동');
              navigate('/vendor/dashboard', { replace: true });
            } else if (user.vendorType === 'popup') {
              console.log('🎪 팝업 벤더 대시보드로 이동');
              navigate('/vendor/popup', { replace: true });
            } else if (user.vendorType === 'food') {
              console.log('🍽️ 음식 벤더 대시보드로 이동');
              navigate('/vendor/food', { replace: true });
            } else if (user.vendorType === 'attraction' || user.vendorType === 'attractions') {
              console.log('📷 관광지 벤더 대시보드로 이동');
              navigate('/vendor/attractions', { replace: true });
            } else if (user.vendorType === 'travel') {
              console.log('🗺️ 여행 벤더 대시보드로 이동');
              navigate('/vendor/popup', { replace: true }); // 팝업 대시보드 공유 (travel은 유지)
            } else if (user.vendorType === 'event' || user.vendorType === 'events') {
              console.log('📅 행사 벤더 대시보드로 이동');
              navigate('/vendor/events', { replace: true });
            } else if (user.vendorType === 'experience') {
              console.log('🎡 체험 벤더 대시보드로 이동');
              navigate('/vendor/experience', { replace: true });
            } else if (user.vendorType === 'tour') {
              console.log('🗺️ 투어 벤더 대시보드로 이동');
              navigate('/vendor/tour', { replace: true });
            } else {
              // vendorType이 없으면 기본 팝업 대시보드로 이동 (Toss 심사용)
              console.log('🎪 벤더 대시보드로 이동 (기본 - 팝업)');
              navigate('/vendor/popup', { replace: true });
            }
          } else {
            console.log('🏠 홈으로 이동');
            navigate('/', { replace: true });
          }
        }, 100);
      } else {
        console.error('❌ 로그인 실패');
        toast.error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      toast.error('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const googleAuth = initGoogleAuth();
    if (!googleAuth) {
      toast.error('Google 로그인이 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await googleAuth.loginWithGoogle();

      const result = await api.socialLogin({
        provider: 'google',
        providerId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.picture
      });

      if (result.success && result.data) {
        toast.success('Google 로그인 성공!');
        // useAuth가 사용하는 키 이름으로 저장
        localStorage.setItem('auth_token', result.data.token);
        localStorage.setItem('user_info', JSON.stringify(result.data.user));

        // 저장 검증 (모바일 중요)
        const tokenCheck = localStorage.getItem('auth_token');
        if (!tokenCheck) {
          console.error('❌ Google 로그인: 토큰 저장 실패');
          toast.error('로그인 정보 저장 실패. 브라우저 설정을 확인해주세요.');
          setIsLoading(false);
          return;
        }

        console.log('✅ Google 로그인: 토큰 저장 성공, 리다이렉트 시작');

        // 페이지 새로고침으로 세션 복원 (returnUrl 유지)
        window.location.href = returnUrl || '/';
      } else {
        toast.error(result.error || 'Google 로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error(error instanceof Error ? error.message : 'Google 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    const kakaoAuth = initKakaoAuth();
    if (!kakaoAuth) {
      toast.error('카카오 로그인이 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await kakaoAuth.loginWithKakao();

      const result = await api.socialLogin({
        provider: 'kakao',
        providerId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.picture,
        phone: user.phone
      });

      if (result.success && result.data) {
        toast.success('카카오 로그인 성공!');
        // useAuth가 사용하는 키 이름으로 저장
        localStorage.setItem('auth_token', result.data.token);
        localStorage.setItem('user_info', JSON.stringify(result.data.user));

        // 저장 검증 (모바일 중요)
        const tokenCheck = localStorage.getItem('auth_token');
        if (!tokenCheck) {
          console.error('❌ 카카오 로그인: 토큰 저장 실패');
          toast.error('로그인 정보 저장 실패. 브라우저 설정을 확인해주세요.');
          setIsLoading(false);
          return;
        }

        console.log('✅ 카카오 로그인: 토큰 저장 성공, 리다이렉트 시작');

        // 페이지 새로고침으로 세션 복원 (returnUrl 유지)
        window.location.href = returnUrl || '/';
      } else {
        toast.error(result.error || '카카오 로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Kakao login error:', error);
      toast.error(error instanceof Error ? error.message : '카카오 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNaverLogin = async () => {
    const naverAuth = initNaverAuth();
    if (!naverAuth) {
      toast.error('네이버 로그인이 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await naverAuth.loginWithNaver();

      const result = await api.socialLogin({
        provider: 'naver',
        providerId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.picture
      });

      if (result.success && result.data) {
        toast.success('네이버 로그인 성공!');
        // useAuth가 사용하는 키 이름으로 저장
        localStorage.setItem('auth_token', result.data.token);
        localStorage.setItem('user_info', JSON.stringify(result.data.user));

        // 저장 검증 (모바일 중요)
        const tokenCheck = localStorage.getItem('auth_token');
        if (!tokenCheck) {
          console.error('❌ 네이버 로그인: 토큰 저장 실패');
          toast.error('로그인 정보 저장 실패. 브라우저 설정을 확인해주세요.');
          setIsLoading(false);
          return;
        }

        console.log('✅ 네이버 로그인: 토큰 저장 성공, 리다이렉트 시작');

        // 페이지 새로고침으로 세션 복원 (returnUrl 유지)
        window.location.href = returnUrl || '/';
      } else {
        toast.error(result.error || '네이버 로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Naver login error:', error);
      toast.error(error instanceof Error ? error.message : '네이버 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 배너 섹션 */}
      <div
        className="relative w-full h-[200px] md:h-[300px] bg-cover bg-center flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: `url("${bannerImage || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1366&h=300&fit=crop'}")` }}
      >
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white m-0">
            로그인
          </h1>
        </div>
        {/* 어두운 오버레이 */}
        <div className="absolute inset-0 bg-black/20 z-0"></div>
      </div>

      {/* 로그인 카드 */}
      <div className="max-w-[90%] sm:max-w-[480px] md:max-w-[500px] mx-auto mt-6 md:mt-10 mb-10 p-4 sm:p-6 md:p-8 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
        {/* 헤더 */}
        <div className="text-center mb-5">
          <ul className="list-none p-0 m-0 flex justify-center gap-4">
            <li className="font-bold text-black">로그인</li>
            <li>
              <button
                onClick={() => navigate('/signup')}
                className="text-black no-underline hover:underline bg-none border-none cursor-pointer"
              >
                회원가입
              </button>
            </li>
          </ul>
        </div>

        {/* 폼 */}
        <div>
          <form onSubmit={handleSubmit}>
            {/* 이메일 */}
            <div className="mb-4">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일*"
                required
                className="w-full px-4 py-3 md:py-3.5 border border-gray-300 rounded-md text-base md:text-sm touch-manipulation"
              />
            </div>

            {/* 비밀번호 */}
            <div className="mb-4">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호*"
                required
                className="w-full px-4 py-3 md:py-3.5 border border-gray-300 rounded-md text-base md:text-sm touch-manipulation"
              />
            </div>

            {/* 로그인 상태 유지 */}
            <div className="text-xs my-3 flex items-center space-x-2">
              <Checkbox 
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <label htmlFor="remember-me" className="text-gray-700">
                로그인 상태 유지
              </label>
            </div>

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 md:py-3 bg-[#5c2d91] hover:bg-[#4b2375] text-white border-none rounded-md text-base md:text-sm cursor-pointer mb-4 touch-manipulation active:scale-[0.98] transition-transform"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>

            {/* 구글 로그인 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full min-h-[48px] h-12 md:h-11 px-4 md:px-3 rounded-lg mb-3 flex items-center gap-3 text-base md:text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)] active:scale-[0.98] bg-white border border-[#dadce0] text-[#3c4043] touch-manipulation disabled:opacity-50"
            >
              <span className="flex-none w-[22px] h-[22px] inline-flex items-center justify-center">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/2048px-Google_%22G%22_logo.svg.png" 
                  alt="Google 로고"
                  className="max-w-full max-h-full block"
                />
              </span>
              <span className="flex-1 text-center leading-none tracking-wide">
                Google 계정으로 로그인
              </span>
            </button>

            {/* 카카오 로그인 */}
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={isLoading}
              className="w-full min-h-[48px] h-12 md:h-11 px-4 md:px-3 rounded-lg mb-3 flex items-center gap-3 text-base md:text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)] active:scale-[0.98] bg-[#FEE500] border border-[#e5cf00] text-[#191919] touch-manipulation disabled:opacity-50"
            >
              <span className="flex-none w-[22px] h-[22px] inline-flex items-center justify-center">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/KakaoTalk_logo.svg/960px-KakaoTalk_logo.svg.png"
                  alt="Kakao 로고"
                  className="max-w-full max-h-full block"
                />
              </span>
              <span className="flex-1 text-center leading-none tracking-wide">
                카카오 계정으로 로그인
              </span>
            </button>

            {/* 네이버 로그인 */}
            <button
              type="button"
              onClick={handleNaverLogin}
              disabled={isLoading}
              className="w-full min-h-[48px] h-12 md:h-11 px-4 md:px-3 rounded-lg mb-3 flex items-center gap-3 text-base md:text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)] active:scale-[0.98] bg-[#03C75A] border border-[#02b351] text-white touch-manipulation disabled:opacity-50"
            >
              <span className="flex-none w-[22px] h-[22px] inline-flex items-center justify-center bg-white rounded-sm">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#03C75A">
                  <path d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"/>
                </svg>
              </span>
              <span className="flex-1 text-center leading-none tracking-wide">
                네이버 계정으로 로그인
              </span>
            </button>
          </form>

          {/* 회원가입 링크 */}
          <div className="text-center mt-4 text-sm text-gray-600">
            계정이 없으신가요? {' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-[#5c2d91] hover:underline bg-none border-none cursor-pointer"
            >
              회원가입
            </button>
          </div>

          {/* 비밀번호 찾기 */}
          <div className="text-center mt-2">
            <a href="#" className="text-xs text-gray-500 hover:underline">
              비밀번호를 잊으셨나요?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
