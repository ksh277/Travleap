/**
 * SSO 콜백 페이지
 * /sso/callback?token=xxx
 *
 * 다른 사이트(PINTO)에서 온 SSO 토큰을 받아서 로그인 처리
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// 쿠키 설정 헬퍼 함수
const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

export default function SSOCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('SSO 토큰이 없습니다.');
      setStatus('error');
      return;
    }

    // SSO 토큰 검증
    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (ssoToken: string) => {
    try {
      const response = await fetch('/api/sso/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: ssoToken })
      });

      const data = await response.json();

      if (data.success) {
        // 토큰 저장 (쿠키 + localStorage)
        setCookie('auth_token', data.data.token, 7);
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user_info', JSON.stringify(data.data.user));

        console.log('✅ SSO 로그인 성공:', data.data.user.email);

        setStatus('success');

        // 리다이렉트 (페이지 새로고침으로 세션 복원)
        const redirectPath = data.data.redirect_path || '/';
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 1000);
      } else {
        setError(data.error || 'SSO 인증에 실패했습니다.');
        setStatus('error');
      }
    } catch (err) {
      console.error('SSO 검증 오류:', err);
      setError('SSO 인증 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              로그인 중...
            </h2>
            <p className="text-gray-600">
              SSO 인증을 처리하고 있습니다.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              로그인 성공!
            </h2>
            <p className="text-gray-600">
              잠시 후 이동합니다...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              인증 실패
            </h2>
            <p className="text-red-600 mb-4">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              로그인 페이지로 이동
            </button>
          </>
        )}
      </div>
    </div>
  );
}
