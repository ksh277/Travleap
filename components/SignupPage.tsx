import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { t } from '../utils/translations';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { initGoogleAuth, initKakaoAuth, initNaverAuth } from '../utils/socialAuth';

export function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [agreements, setAgreements] = useState({
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAgreementChange = (field: keyof typeof agreements) => (checked: boolean | 'indeterminate') => {
    setAgreements(prev => ({ ...prev, [field]: checked === true }));
    // Clear error when user agrees
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired', 'ko');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('emailRequired', 'ko');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('phoneRequired', 'ko');
    }

    if (!formData.password) {
      newErrors.password = t('passwordRequired', 'ko');
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('confirmPasswordRequired', 'ko');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('passwordMismatch', 'ko');
    }

    if (!agreements.agreeTerms) {
      newErrors.agreeTerms = t('termsRequired', 'ko');
    }

    if (!agreements.agreePrivacy) {
      newErrors.agreePrivacy = '개인정보처리방침에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // 실제 DB API를 통한 회원가입 처리
      const result = await api.registerUser({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone
      });

      if (result.success && result.data) {
        toast.success('회원가입이 완료되었습니다! 환영합니다!');

        // 자동 로그인
        const loginResult = await login(formData.email, formData.password);
        if (loginResult) {
          navigate('/', { replace: true });
        } else {
          navigate('/login');
        }
      } else {
        toast.error(result.error || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const googleAuth = initGoogleAuth();
    if (!googleAuth) {
      toast.error('Google 로그인이 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await googleAuth.loginWithGoogle();

      // API를 통해 소셜 로그인 처리
      const result = await api.socialLogin({
        provider: 'google',
        providerId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.picture
      });

      if (result.success && result.data) {
        toast.success('Google 로그인 성공!');
        // useAuth의 login 상태 업데이트
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        navigate('/', { replace: true });
        window.location.reload();
      } else {
        toast.error(result.error || 'Google 로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Google 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoSignup = async () => {
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
        avatar: user.picture
      });

      if (result.success && result.data) {
        toast.success('카카오 로그인 성공!');
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        navigate('/', { replace: true });
        window.location.reload();
      } else {
        toast.error(result.error || '카카오 로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Kakao signup error:', error);
      toast.error(error instanceof Error ? error.message : '카카오 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNaverSignup = async () => {
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
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        navigate('/', { replace: true });
        window.location.reload();
      } else {
        toast.error(result.error || '네이버 로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Naver signup error:', error);
      toast.error(error instanceof Error ? error.message : '네이버 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 배너 섹션 */}
      <div 
        className="relative w-full h-[300px] bg-cover bg-center flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: 'url("https://placehold.co/1366x300")' }}
      >
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold text-white m-0">
            {t('signupTitle', 'ko')}
          </h1>
          <p className="text-white/90 mt-2">
            {t('signupSubtitle', 'ko')}
          </p>
        </div>
        {/* 어두운 오버레이 */}
        <div className="absolute inset-0 bg-black/20 z-0"></div>
      </div>

      {/* 회원가입 카드 */}
      <div className="max-w-[450px] mx-auto mt-10 mb-10 p-6 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
        {/* 헤더 */}
        <div className="text-center mb-5">
          <ul className="list-none p-0 m-0 flex justify-center gap-4">
            <li>
              <a href="#" onClick={() => navigate('/login')} className="text-black no-underline hover:underline">
                {t('login', 'ko')}
              </a>
            </li>
            <li className="font-bold text-black">{t('signupTitle', 'ko')}</li>
          </ul>
        </div>

        {/* 폼 */}
        <div>
          <form onSubmit={handleSubmit}>
            {/* 이름 */}
            <div className="mb-3.5">
              <Input
                type="text"
                value={formData.name}
                onChange={handleInputChange('name')}
                placeholder={`${t('name', 'ko')}*`}
                className={`w-full px-3 py-2.5 border rounded-md text-sm ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* 이메일 */}
            <div className="mb-3.5">
              <Input
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder={`${t('email', 'ko')}*`}
                className={`w-full px-3 py-2.5 border rounded-md text-sm ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* 전화번호 */}
            <div className="mb-3.5">
              <Input
                type="tel"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                placeholder={`${t('phone', 'ko')}*`}
                className={`w-full px-3 py-2.5 border rounded-md text-sm ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="mb-3.5">
              <Input
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder={`${t('password', 'ko')}*`}
                className={`w-full px-3 py-2.5 border rounded-md text-sm ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div className="mb-4">
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                placeholder={`${t('confirmPassword', 'ko')}*`}
                className={`w-full px-3 py-2.5 border rounded-md text-sm ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* 약관 동의 */}
            <div className="mb-4 space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="agree-terms"
                  checked={agreements.agreeTerms}
                  onCheckedChange={handleAgreementChange('agreeTerms')}
                  className={errors.agreeTerms ? 'border-red-500' : ''}
                />
                <label htmlFor="agree-terms" className="text-sm text-gray-700 leading-relaxed">
                  {t('agreeTerms', 'ko')}
                </label>
              </div>
              {errors.agreeTerms && (
                <p className="text-red-500 text-xs">{errors.agreeTerms}</p>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="agree-privacy"
                  checked={agreements.agreePrivacy}
                  onCheckedChange={handleAgreementChange('agreePrivacy')}
                  className={errors.agreePrivacy ? 'border-red-500' : ''}
                />
                <label htmlFor="agree-privacy" className="text-sm text-gray-700 leading-relaxed">
                  {t('agreePrivacy', 'ko')}
                </label>
              </div>
              {errors.agreePrivacy && (
                <p className="text-red-500 text-xs">{errors.agreePrivacy}</p>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="agree-marketing"
                  checked={agreements.agreeMarketing}
                  onCheckedChange={handleAgreementChange('agreeMarketing')}
                />
                <label htmlFor="agree-marketing" className="text-sm text-gray-500 leading-relaxed">
                  {t('agreeMarketing', 'ko')}
                </label>
              </div>
            </div>

            {/* 회원가입 버튼 */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#5c2d91] hover:bg-[#4b2375] text-white border-none rounded-md text-sm cursor-pointer mb-4"
            >
              {isLoading ? '가입 중...' : t('createAccount', 'ko')}
            </Button>

            {/* 소셜 회원가입 구분선 */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-gray-300 w-full"></div>
              <span className="bg-white px-4 text-sm text-gray-500">또는</span>
              <div className="border-t border-gray-300 w-full"></div>
            </div>

            {/* 구글 회원가입 */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              className="w-full h-11 px-3 rounded-lg mb-2.5 flex items-center gap-2.5 text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:-translate-y-px bg-white border border-[#dadce0] text-[#3c4043]"
            >
              <span className="flex-none w-[22px] h-[22px] inline-flex items-center justify-center">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/2048px-Google_%22G%22_logo.svg.png" 
                  alt="Google 로고"
                  className="max-w-full max-h-full block"
                />
              </span>
              <span className="flex-1 text-center leading-none tracking-wide">
                Google 계정으로 가입하기
              </span>
            </button>

            {/* 카카오 회원가입 */}
            <button
              type="button"
              onClick={handleKakaoSignup}
              className="w-full h-11 px-3 rounded-lg mb-2.5 flex items-center gap-2.5 text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:-translate-y-px bg-[#FEE500] border border-[#e5cf00] text-[#191919]"
            >
              <span className="flex-none w-[22px] h-[22px] inline-flex items-center justify-center">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/KakaoTalk_logo.svg/960px-KakaoTalk_logo.svg.png"
                  alt="Kakao 로고"
                  className="max-w-full max-h-full block"
                />
              </span>
              <span className="flex-1 text-center leading-none tracking-wide">
                카카오 계정으로 가입하기
              </span>
            </button>

            {/* 네이버 회원가입 */}
            <button
              type="button"
              onClick={handleNaverSignup}
              className="w-full h-11 px-3 rounded-lg mb-4 flex items-center gap-2.5 text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:-translate-y-px bg-[#03C75A] border border-[#02b351] text-white"
            >
              <span className="flex-none w-[22px] h-[22px] inline-flex items-center justify-center">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Naver_Logo.svg/1200px-Naver_Logo.svg.png"
                  alt="Naver 로고"
                  className="max-w-full max-h-full block"
                />
              </span>
              <span className="flex-1 text-center leading-none tracking-wide">
                네이버 계정으로 가입하기
              </span>
            </button>
          </form>

          {/* 로그인 링크 */}
          <div className="text-center mt-4 text-sm text-gray-600">
            {t('haveAccount', 'ko')} <a href="#" onClick={() => navigate('/login')} className="text-[#5c2d91] hover:underline">{t('login', 'ko')}</a>
          </div>
        </div>
      </div>
    </div>
  );
}