/**
 * reCAPTCHA v3 Hook
 * Google reCAPTCHA v3 토큰 생성을 위한 커스텀 훅
 */

import { useState, useEffect, useCallback } from 'react';

// reCAPTCHA 글로벌 타입 선언
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
    __RECAPTCHA_SITE_KEY__?: string;
  }
}

interface UseRecaptchaReturn {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  executeRecaptcha: (action: string) => Promise<string | null>;
}

// reCAPTCHA 사이트 키 캐시
let cachedSiteKey: string | null = null;
let scriptLoaded = false;

/**
 * reCAPTCHA 스크립트 로드
 */
const loadRecaptchaScript = (siteKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (scriptLoaded && window.grecaptcha) {
      resolve();
      return;
    }

    // 이미 스크립트가 있는지 확인
    const existingScript = document.querySelector('script[src*="recaptcha"]');
    if (existingScript) {
      // 스크립트가 로드되었으면 ready 대기
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          scriptLoaded = true;
          resolve();
        });
      } else {
        existingScript.addEventListener('load', () => {
          window.grecaptcha.ready(() => {
            scriptLoaded = true;
            resolve();
          });
        });
      }
      return;
    }

    // 새 스크립트 생성
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;

    script.onload = () => {
      window.grecaptcha.ready(() => {
        scriptLoaded = true;
        resolve();
      });
    };

    script.onerror = () => {
      reject(new Error('reCAPTCHA 스크립트 로드 실패'));
    };

    document.head.appendChild(script);
  });
};

/**
 * reCAPTCHA v3 사용을 위한 커스텀 훅
 */
export function useRecaptcha(): UseRecaptchaReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(cachedSiteKey);

  // 사이트 키 가져오기 및 스크립트 로드
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 캐시된 키가 있으면 사용
        if (cachedSiteKey) {
          setSiteKey(cachedSiteKey);
          await loadRecaptchaScript(cachedSiteKey);
          setIsReady(true);
          setIsLoading(false);
          return;
        }

        // API에서 사이트 키 가져오기
        const response = await fetch('/api/config/recaptcha');
        const data = await response.json();

        if (!data.success || !data.siteKey) {
          console.warn('reCAPTCHA 사이트 키가 설정되지 않았습니다. reCAPTCHA 검증이 비활성화됩니다.');
          setIsReady(false);
          setIsLoading(false);
          return;
        }

        cachedSiteKey = data.siteKey;
        setSiteKey(data.siteKey);

        // 스크립트 로드
        await loadRecaptchaScript(data.siteKey);
        setIsReady(true);
      } catch (err) {
        console.error('reCAPTCHA 초기화 오류:', err);
        setError('reCAPTCHA를 초기화하는 중 오류가 발생했습니다.');
        setIsReady(false);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  /**
   * reCAPTCHA 토큰 실행
   * @param action - 실행할 액션 (예: 'login', 'signup')
   * @returns reCAPTCHA 토큰 또는 null
   */
  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    if (!isReady || !siteKey) {
      console.warn('reCAPTCHA가 준비되지 않았습니다. 토큰 없이 진행합니다.');
      return null;
    }

    try {
      const token = await window.grecaptcha.execute(siteKey, { action });
      return token;
    } catch (err) {
      console.error('reCAPTCHA 실행 오류:', err);
      return null;
    }
  }, [isReady, siteKey]);

  return {
    isReady,
    isLoading,
    error,
    executeRecaptcha
  };
}

export default useRecaptcha;
