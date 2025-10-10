import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('🔑 로그인 시도:', email);

    const result = login(email, password);

    if (result) {
      toast.success('로그인 성공!');
      if (email === 'admin@shinan.com') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      toast.error('로그인 실패');
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth
  };

  const handleKakaoLogin = () => {
    // TODO: Implement Kakao OAuth
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
            로그인
          </h1>
        </div>
        {/* 어두운 오버레이 */}
        <div className="absolute inset-0 bg-black/20 z-0"></div>
      </div>

      {/* 로그인 카드 */}
      <div className="max-w-[400px] mx-auto mt-10 mb-10 p-6 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
        {/* 헤더 */}
        <div className="text-center mb-5">
          <ul className="list-none p-0 m-0 flex justify-center gap-4">
            <li className="font-bold text-black">로그인</li>
            <li>
              <button
                onClick={() => window.location.hash = 'signup'}
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
            <div className="mb-3.5">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일*"
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* 비밀번호 */}
            <div className="mb-3.5">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호*"
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm"
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
              className="w-full py-3 bg-[#5c2d91] hover:bg-[#4b2375] text-white border-none rounded-md text-sm cursor-pointer mb-3"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>

            {/* 구글 로그인 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
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
                Google 계정으로 로그인
              </span>
            </button>

            {/* 카카오 로그인 */}
            <button
              type="button"
              onClick={handleKakaoLogin}
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
                카카오 계정으로 로그인
              </span>
            </button>

            {/* 네이버 로그인 */}
            <button
              type="button"
              onClick={() => console.log('Naver login')}
              className="w-full h-11 px-3 rounded-lg mb-2.5 flex items-center gap-2.5 text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:-translate-y-px bg-[#03C75A] border border-[#02b351] text-white"
            >
              <span className="flex-none w-[22px] h-[22px] inline-flex items-center justify-center">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Naver_Logo.svg/1200px-Naver_Logo.svg.png"
                  alt="Naver 로고"
                  className="max-w-full max-h-full block"
                />
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
              onClick={() => window.location.hash = 'signup'}
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