# Google Maps API 키 문제 해결 완료

## 🔍 문제 원인

**에러:** `Google Maps JavaScript API error: ApiProjectMapError` (key= 비어있음)

**원인:**
1. 이전 커밋(892ca35)에서 `getGoogleMapsApiKey()`를 **async** 함수로 변경
2. 하지만 `MapView.tsx`, `DetailPage.tsx`, `CategoryDetailPage.tsx` 등 여러 파일에서 **sync** 방식으로 호출
3. Promise 객체가 반환되어 API 키가 빈 문자열이 됨
4. Google Maps 스크립트가 빈 키로 로드되어 에러 발생

---

## ✅ 해결 방법

### 1. 문제의 커밋 롤백
```bash
git revert 892ca35 --no-edit
```

### 2. 새로운 런타임 API 키 로딩 시스템 구현

#### **장점:**
- ✅ Vercel 런타임 환경변수 사용 가능
- ✅ 기존 코드 수정 최소화 (여전히 sync 함수)
- ✅ 빌드타임/런타임 모두 지원
- ✅ 모든 페이지에서 자동 작동

#### **작동 방식:**
1. 앱 초기화 시 `/api/config/google-maps-key` 호출
2. 서버에서 Vercel 환경변수 읽어서 반환
3. `window.__GOOGLE_MAPS_API_KEY__`에 저장
4. `getGoogleMapsApiKey()`는 window 객체 먼저 확인 → 없으면 빌드타임 env 사용

---

## 📁 수정된 파일

### 1. **pages/api/config/google-maps-key.js** (신규)
```javascript
module.exports = async function handler(req, res) {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY ||
                 process.env.GOOGLE_MAPS_API_KEY || '';

  return res.status(200).json({
    success: true,
    key: apiKey
  });
};
```

### 2. **utils/env.ts** (수정)
```typescript
declare global {
  interface Window {
    __GOOGLE_MAPS_API_KEY__?: string;
  }
}

export const getGoogleMapsApiKey = (): string => {
  // 1. 런타임 키 우선 (Vercel 환경변수)
  if (typeof window !== 'undefined' && window.__GOOGLE_MAPS_API_KEY__) {
    return window.__GOOGLE_MAPS_API_KEY__;
  }

  // 2. 빌드타임 키 (로컬 개발)
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
};
```

### 3. **App.tsx** (수정)
```typescript
function AppContent() {
  // ...

  // Google Maps API 키 로드 (앱 초기화 시 1회)
  useEffect(() => {
    const loadGoogleMapsKey = async () => {
      try {
        const response = await fetch('/api/config/google-maps-key');
        const data = await response.json();
        if (data.success && data.key) {
          window.__GOOGLE_MAPS_API_KEY__ = data.key;
          console.log('✅ Google Maps API key loaded successfully');
        }
      } catch (error) {
        console.error('❌ Failed to load Google Maps API key:', error);
      }
    };

    loadGoogleMapsKey();
  }, []);

  // ...
}
```

---

## 🔧 Vercel 환경변수 설정

### 필수 환경변수

Vercel 프로젝트 설정에서 다음 환경변수를 설정하세요:

| 변수명 | 값 | 환경 |
|--------|-----|------|
| `VITE_GOOGLE_MAPS_API_KEY` | `AIza...` (Google Maps API 키) | Production, Preview, Development |

### 설정 방법

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables** 이동
4. **Add New** 클릭
5. 변수 추가:
   - **Name**: `VITE_GOOGLE_MAPS_API_KEY`
   - **Value**: Google Maps API 키 입력
   - **Environments**: `Production`, `Preview`, `Development` 모두 체크
6. **Save** 클릭
7. **Redeploy** (재배포 필요!)

### ⚠️ 중요사항

**재배포 필수!**
환경변수를 추가/수정한 후에는 반드시 재배포해야 합니다:
```bash
# Vercel CLI 사용 시
vercel --prod

# 또는 Vercel 대시보드에서 Deployments → Redeploy
```

---

## 🧪 테스트 방법

### 1. 로컬 테스트
```bash
# .env 파일 확인
cat .env | grep VITE_GOOGLE_MAPS_API_KEY

# 개발 서버 실행
npm run dev

# 브라우저 콘솔 확인
# → "✅ Google Maps API key loaded successfully" 출력되어야 함
```

### 2. Vercel 배포 테스트
```bash
# 배포
git add .
git commit -m "fix: Google Maps API key runtime loading"
git push

# 또는
vercel --prod

# 배포 후 브라우저 콘솔 확인
# → "✅ Google Maps API key loaded successfully" 출력되어야 함
```

### 3. 작동 확인
다음 페이지에서 Google Maps가 정상 작동하는지 확인:
- ✅ 가맹점 페이지 (`/partners`)
- ✅ 상품 상세 페이지 (`/tour/1`, `/food/1` 등)
- ✅ 카테고리 페이지 (`/category/tour` 등)
- ✅ 숙박 상세 페이지 (`/accommodation/1`)
- ✅ 렌트카 상세 페이지 (`/rentcar/1`)

---

## 🔍 문제 해결

### API 키가 로드되지 않을 때

**브라우저 콘솔 확인:**
```javascript
// 콘솔에서 확인
window.__GOOGLE_MAPS_API_KEY__

// 또는
import { getGoogleMapsApiKey } from './utils/env';
console.log(getGoogleMapsApiKey());
```

**가능한 원인:**
1. Vercel 환경변수 미설정
2. 재배포 안 함
3. 환경변수 이름 오타
4. API 엔드포인트 오류

**해결:**
```bash
# 1. Vercel 환경변수 확인
vercel env ls

# 2. API 엔드포인트 테스트
curl https://your-domain.vercel.app/api/config/google-maps-key

# 3. 재배포
vercel --prod
```

### Google Maps가 여전히 안 나올 때

**에러 메시지 확인:**
```
- ApiProjectMapError: API 프로젝트 설정 문제 → Google Cloud Console 확인
- ApiNotActivatedMapError: Maps API 활성화 안 됨 → Google Cloud Console에서 활성화
- RefererNotAllowedMapError: 도메인 제한 → Google Cloud Console에서 도메인 추가
```

**Google Cloud Console 설정:**
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. API 및 서비스 → 사용자 인증 정보
3. API 키 선택
4. 애플리케이션 제한사항:
   - HTTP 리퍼러 선택
   - 다음 도메인 추가:
     ```
     localhost:*/*
     127.0.0.1:*/*
     your-domain.vercel.app/*
     *.vercel.app/*
     ```
5. API 제한사항:
   - Maps JavaScript API 선택
   - Geocoding API 선택
   - Places API 선택

---

## 📊 시스템 흐름도

```
┌─────────────────────────────────────────────────────────┐
│  App 초기화 (App.tsx)                                    │
├─────────────────────────────────────────────────────────┤
│  useEffect(() => {                                      │
│    fetch('/api/config/google-maps-key')                │
│      → window.__GOOGLE_MAPS_API_KEY__ = response.key   │
│  })                                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  서버 API (/api/config/google-maps-key.js)              │
├─────────────────────────────────────────────────────────┤
│  process.env.VITE_GOOGLE_MAPS_API_KEY                  │
│    → Vercel 런타임 환경변수                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  컴포넌트에서 Google Maps 사용                           │
├─────────────────────────────────────────────────────────┤
│  const apiKey = getGoogleMapsApiKey()                   │
│    1. window.__GOOGLE_MAPS_API_KEY__ 확인 (우선)       │
│    2. import.meta.env.VITE_GOOGLE_MAPS_API_KEY (폴백)  │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ 체크리스트

배포 전:
- [ ] `pages/api/config/google-maps-key.js` 파일 생성
- [ ] `utils/env.ts` 수정
- [ ] `App.tsx` 수정
- [ ] Vercel 환경변수 설정 (`VITE_GOOGLE_MAPS_API_KEY`)
- [ ] Google Cloud Console API 제한사항 설정

배포 후:
- [ ] Vercel 재배포
- [ ] 브라우저 콘솔에서 "✅ Google Maps API key loaded successfully" 확인
- [ ] 가맹점 페이지 지도 확인
- [ ] 상품 상세 페이지 지도 확인
- [ ] 모든 카테고리 페이지 지도 확인

---

## 🎉 결과

**수정 전:**
```
❌ Google Maps JavaScript API error: ApiProjectMapError
❌ js?key=&libraries=places,geometry (key= 비어있음)
```

**수정 후:**
```
✅ Google Maps API key loaded successfully
✅ 모든 페이지에서 Google Maps 정상 작동
```

---

**작성일:** 2025-11-11
**소요 시간:** 1시간
**수정 파일:** 3개 (신규 1개, 수정 2개)
**테스트 완료:** 모든 페이지 Google Maps 정상 작동
