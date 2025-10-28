import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

// 카카오 맵 SDK 동적 로드
const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
if (kakaoAppKey && kakaoAppKey !== 'YOUR_KAKAO_JS_KEY') {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoAppKey}&libraries=services&autoload=false`;
  script.async = true;
  document.head.appendChild(script);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)