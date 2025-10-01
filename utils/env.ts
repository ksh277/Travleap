// 환경 변수 관리 유틸리티

export const getGoogleMapsApiKey = (): string => {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
};

export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3004';
};

export const isDevelopment = (): boolean => {
  return import.meta.env.VITE_NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  return import.meta.env.VITE_NODE_ENV === 'production';
};