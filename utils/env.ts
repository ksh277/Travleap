// 환경 변수 관리 유틸리티

let cachedGoogleMapsKey: string | null = null;

export const getGoogleMapsApiKey = async (): Promise<string> => {
  // 캐시된 키가 있으면 반환
  if (cachedGoogleMapsKey) {
    return cachedGoogleMapsKey;
  }

  // 서버에서 키 가져오기
  try {
    const response = await fetch('/api/config/google-maps-key');
    const data = await response.json();
    if (data.success && data.key) {
      cachedGoogleMapsKey = data.key;
      return data.key;
    }
  } catch (error) {
    console.error('Failed to fetch Google Maps API key:', error);
  }

  // 폴백: 빌드 타임 환경변수 (로컬 개발용)
  const fallbackKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  if (fallbackKey) {
    cachedGoogleMapsKey = fallbackKey;
  }
  return fallbackKey;
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