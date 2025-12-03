/**
 * SSO 링크 컴포넌트
 * 다른 사이트(PINTO)로 이동할 때 사용
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ExternalLink, Loader2 } from 'lucide-react';

interface SSOLinkProps {
  target: 'pinto' | 'travleap';
  redirectPath?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: 'button' | 'link' | 'icon';
}

export function SSOLink({
  target,
  redirectPath = '/',
  children,
  className = '',
  variant = 'button'
}: SSOLinkProps) {
  const { isLoggedIn, getAuthToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const targetNames = {
    pinto: 'PINTO',
    travleap: 'Travleap'
  };

  const targetUrls = {
    pinto: 'https://pinto-now.vercel.app',
    travleap: 'https://travleap.com'
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    // 로그인 안 되어 있으면 그냥 해당 사이트로 이동
    if (!isLoggedIn) {
      window.location.href = `${targetUrls[target]}${redirectPath}`;
      return;
    }

    setIsLoading(true);

    try {
      const token = getAuthToken();
      const response = await fetch('/api/sso/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target,
          redirect_path: redirectPath
        })
      });

      const data = await response.json();

      if (data.success) {
        // SSO 콜백 URL로 이동
        window.location.href = data.data.callback_url;
      } else {
        console.error('SSO 토큰 생성 실패:', data.error);
        // 실패 시 그냥 이동
        window.location.href = `${targetUrls[target]}${redirectPath}`;
      }
    } catch (error) {
      console.error('SSO 요청 오류:', error);
      // 오류 시 그냥 이동
      window.location.href = `${targetUrls[target]}${redirectPath}`;
    } finally {
      setIsLoading(false);
    }
  };

  // 버튼 스타일
  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ExternalLink className="w-4 h-4" />
        )}
        {children || `${targetNames[target]} 바로가기`}
      </button>
    );
  }

  // 링크 스타일
  if (variant === 'link') {
    return (
      <a
        href="#"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline ${className}`}
      >
        {children || `${targetNames[target]} 바로가기`}
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ExternalLink className="w-3 h-3" />
        )}
      </a>
    );
  }

  // 아이콘만
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${className}`}
      title={`${targetNames[target]} 바로가기`}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
      ) : (
        <ExternalLink className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
}

export default SSOLink;
