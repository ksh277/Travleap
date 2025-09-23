# Travelap - 신안 여행 플랫폼

신안 지역 특화 여행 플랫폼으로, 여행, 렌트카, 숙박, 음식, 관광지, 체험, 팝업, 행사 정보를 한 곳에서 제공합니다.

## 🚀 배포

이 프로젝트는 Vercel에 최적화되어 있습니다.

### 빌드 설정
- **Framework**: Vite (React)
- **Node.js**: >= 18.0.0
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 필수 환경 변수
배포 시 다음 환경 변수들을 설정해야 합니다:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ 로컬 개발

```bash
# 종속성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에서 실제 API 키들로 수정

# 개발 서버 시작
npm run dev
```

## 📁 프로젝트 구조

```
├── components/          # React 컴포넌트
├── utils/              # 유틸리티 함수
├── styles/             # CSS 스타일
├── public/             # 정적 파일
├── dist/               # 빌드 결과 (자동 생성)
└── vercel.json         # Vercel 배포 설정
```

## 🗺️ Google Maps 설정

Google Maps 기능을 사용하려면 Google Cloud Console에서 Maps JavaScript API를 활성화하고 API 키를 발급받아야 합니다. 자세한 설정 방법은 `GOOGLE_MAPS_SETUP.md` 파일을 참고하세요.

## 📚 추가 문서

- [배포 가이드](./DEPLOYMENT.md)
- [Google Maps 설정](./GOOGLE_MAPS_SETUP.md)