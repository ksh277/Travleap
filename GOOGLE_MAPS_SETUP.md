# Google Maps API 설정 가이드

Google Maps가 표시되지 않는 문제를 해결하기 위한 단계별 가이드입니다.

## 1. Google Cloud Console 설정

### Step 1: Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/)에 로그인
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### Step 2: Maps JavaScript API 활성화
1. **API 및 서비스** → **라이브러리**로 이동
2. "Maps JavaScript API" 검색 후 선택
3. **사용 설정** 클릭
4. 추가로 활성화할 API들:
   - **Places API** (장소 검색용)
   - **Geocoding API** (주소-좌표 변환용)
   - **Directions API** (경로 찾기용, 선택사항)

### Step 3: API 키 생성
1. **API 및 서비스** → **사용자 인증 정보**로 이동
2. **+ 사용자 인증 정보 만들기** → **API 키** 선택
3. API 키 복사 (예: `AIzaSyC4R6AN7SmxxxxxxxxxxxxxxxxxxxxxxxxxxXuS-jbDtNCzO-XiA`)

### Step 4: API 키 제한 설정 (보안 권장)
1. 생성된 API 키 옆 편집 아이콘 클릭
2. **애플리케이션 제한사항** 설정:
   - **HTTP 리퍼러(웹사이트)** 선택
   - 허용할 도메인 추가:
     ```
     localhost:*
     127.0.0.1:*
     your-domain.vercel.app
     *.vercel.app
     ```

3. **API 제한사항** 설정:
   - **키 제한** 선택
   - 다음 API들 선택:
     - Maps JavaScript API
     - Places API
     - Geocoding API

## 2. 로컬 개발 환경 설정

### Step 1: 환경 변수 파일 생성
`.env.local` 파일을 프로젝트 루트에 생성:

```env
# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE

# 다른 필요한 환경 변수들
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 2: API 키 교체
위의 `YOUR_ACTUAL_API_KEY_HERE`를 Google Cloud Console에서 생성한 실제 API 키로 교체하세요.

## 3. Vercel 배포 환경 설정

### Vercel 대시보드에서 환경 변수 추가:
1. Vercel 프로젝트 설정 → **Environment Variables**
2. 다음 변수 추가:
   - **Name**: `VITE_GOOGLE_MAPS_API_KEY`
   - **Value**: 생성한 Google Maps API 키
   - **Environment**: Production, Preview, Development 모두 선택

## 4. 테스트 및 확인

### 로컬에서 테스트:
```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 파트너 페이지 확인
# 지도가 로드되는지 확인
```

### 브라우저 개발자 도구에서 확인:
1. **Console** 탭에서 오류 메시지 확인
2. 다음과 같은 로그가 표시되어야 함:
   ```
   Google Maps API Key search: {
     VITE_GOOGLE_MAPS_API_KEY: "AIzaSyC4R6AN7SmxxxxxxxxxxxxxxxxxxxxxxxxxxXuS-jbDtNCzO-XiA",
     found: true
   }
   ```

## 5. 문제 해결

### 일반적인 오류들:

#### 1. "Google Maps API key is not configured" 오류
- 환경 변수가 올바르게 설정되지 않음
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- 개발 서버 재시작 필요

#### 2. "This API project is not authorized to use this API" 오류
- Google Cloud Console에서 Maps JavaScript API가 활성화되지 않음
- API 키 제한 설정이 너무 엄격함

#### 3. "RefererNotAllowedMapError" 오류
- API 키의 HTTP 리퍼러 제한 설정 문제
- 현재 도메인이 허용 목록에 없음

#### 4. 지도는 로드되지만 회색으로 표시
- 결제 정보가 설정되지 않음 (Google Cloud에서 결제 계정 연결 필요)
- API 할당량 초과

### 디버깅 단계:
1. 브라우저 개발자 도구에서 네트워크 탭 확인
2. Google Maps API 호출이 실패하는지 확인
3. Console에서 자세한 오류 메시지 확인

## 6. API 사용량 모니터링

### Google Cloud Console에서 모니터링:
1. **API 및 서비스** → **할당량**으로 이동
2. Maps JavaScript API 사용량 확인
3. 필요시 할당량 증가 요청

### 무료 할당량:
- Maps JavaScript API: 월 28,500 로드 무료
- Places API: 월 2,500 요청 무료
- Geocoding API: 월 2,500 요청 무료

## 7. 보안 모범 사례

1. **API 키 제한**: 반드시 도메인 및 API 제한 설정
2. **환경 변수 사용**: 코드에 API 키 하드코딩 금지
3. **정기적 키 교체**: 보안을 위해 주기적으로 API 키 재생성
4. **사용량 모니터링**: 비정상적인 API 호출 감지

---

이 가이드를 따라하면 Google Maps가 정상적으로 표시될 것입니다. 문제가 지속되면 브라우저 개발자 도구의 Console 탭에서 자세한 오류 메시지를 확인하세요.