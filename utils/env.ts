// 환경 변수 관리 유틸리티

export const getGoogleMapsApiKey = (): string => {
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

// Google Maps API를 동적으로 로드
let googleMapsLoaded = false;
let googleMapsLoadPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = (): Promise<void> => {
  // 이미 로드되었으면 즉시 resolve
  if (googleMapsLoaded) {
    return Promise.resolve();
  }

  // 이미 로딩 중이면 같은 Promise 반환
  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  const apiKey = getGoogleMapsApiKey();

  // API 키가 없거나 placeholder이면 경고만 출력하고 resolve
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    console.warn('⚠️ Google Maps API key not configured. Maps will not be displayed.');
    googleMapsLoaded = true;
    return Promise.resolve();
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // 이미 script가 있는지 확인
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleMapsLoaded = true;
      console.log('✅ Google Maps API loaded successfully');
      resolve();
    };

    script.onerror = () => {
      console.error('❌ Failed to load Google Maps API');
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};