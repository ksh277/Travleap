// 환경 변수 관리 유틸리티

// 전역 타입 확장
declare global {
  interface Window {
    __GOOGLE_MAPS_API_KEY__?: string;
  }
}

export const getGoogleMapsApiKey = (): string => {
  // 1. 런타임에 로드된 전역 키 사용 (우선순위 높음)
  if (typeof window !== 'undefined' && window.__GOOGLE_MAPS_API_KEY__) {
    return window.__GOOGLE_MAPS_API_KEY__;
  }

  // 2. 빌드타임 환경변수 사용 (로컬 개발용)
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
};

export const getApiBaseUrl = (): string => {
  // 브라우저 환경에서는 현재 도메인 사용
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3004';
};

export const isDevelopment = (): boolean => {
  return import.meta.env.VITE_NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  return import.meta.env.VITE_NODE_ENV === 'production';
};