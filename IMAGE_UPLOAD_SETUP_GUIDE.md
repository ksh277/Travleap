# 이미지 업로드 시스템 설정 가이드

**작성일**: 2025-10-23
**대상**: Travleap 렌트카 시스템
**목적**: Vercel Blob을 사용한 실제 이미지 업로드 기능 활성화

---

## 📊 현재 상태

### ✅ 이미 구현 완료된 사항

1. **ImageUploader 컴포넌트** ✅
   - 위치: [components/ui/ImageUploader.tsx](components/ui/ImageUploader.tsx)
   - 기능:
     - 드래그 앤 드롭 업로드
     - 파일 선택 버튼
     - 최대 5개 이미지 업로드
     - 10MB 파일 크기 제한
     - 업로드 진행률 표시
     - 이미지 미리보기
     - 대표 이미지 표시
     - 이미지 제거 기능

2. **업로드 API** ✅
   - 위치: [pages/api/upload-image.js](pages/api/upload-image.js)
   - 기능:
     - Vercel Blob Storage 연동
     - formidable을 사용한 파일 파싱
     - 10MB 크기 제한
     - 파일명 자동 생성 (타임스탬프 + 랜덤 문자열)
     - 카테고리별 폴더 분류 (rentcar/)
     - 임시 파일 자동 삭제

3. **필수 패키지** ✅
   - `@vercel/blob@2.0.0` - 설치 완료
   - `formidable@3.5.4` - 설치 완료

4. **벤더 대시보드 통합** ✅
   - [components/VendorDashboardPageEnhanced.tsx](components/VendorDashboardPageEnhanced.tsx:1228-1234)
   - 차량 등록/수정 폼에 ImageUploader 컴포넌트 통합 완료

---

## ⚠️ 설정 필요 사항

### 1. Vercel Blob 토큰 설정

**현재 상태**:
```env
VITE_BLOB_READ_WRITE_TOKEN=
# ↑ 비어있음 - 설정 필요!
```

**해결 방법**: Vercel Blob 스토어 생성 및 토큰 발급

---

## 🚀 Vercel Blob 설정 단계별 가이드

### Step 1: Vercel 대시보드 접속

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. 프로젝트 선택 (Travleap)

### Step 2: Blob Store 생성

1. **Storage 탭** 클릭
2. **Create Database** 버튼 클릭
3. **Blob** 선택
4. 스토어 이름 입력 (예: `travleap-images`)
5. **Create** 클릭

### Step 3: 토큰 발급

Blob Store 생성 완료 후 자동으로 토큰이 생성됩니다:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXX
```

### Step 4: 환경 변수 설정

#### 4-1. 로컬 개발 환경 (.env 파일)

`.env` 파일에 다음 줄을 추가하거나 수정:

```env
# Vercel Blob Storage (이미지 업로드)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXX
```

**중요**: `VITE_` 접두사 **제거**해야 합니다!
- ❌ 잘못된 예: `VITE_BLOB_READ_WRITE_TOKEN=`
- ✅ 올바른 예: `BLOB_READ_WRITE_TOKEN=`

#### 4-2. Vercel 프로덕션 환경

Vercel에서 Blob Store를 프로젝트에 연결하면 **자동으로 환경 변수가 설정**됩니다.

1. Vercel 대시보드 → 프로젝트 선택
2. **Storage** 탭
3. 생성한 Blob Store 옆 **Connect to Project** 클릭
4. 프로젝트 선택 후 **Connect**
5. 자동으로 `BLOB_READ_WRITE_TOKEN` 환경 변수 추가됨

### Step 5: 개발 서버 재시작

```bash
# 현재 개발 서버 중지 (Ctrl+C)
# 다시 시작
npm run dev
```

---

## 🧪 테스트 방법

### 1. 벤더 대시보드에서 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. 벤더 계정으로 로그인
3. **차량 관리** 탭 → **차량 추가** 버튼 클릭
4. 차량 정보 입력 후 **이미지 업로드** 섹션으로 스크롤

#### 테스트 시나리오 1: 드래그 앤 드롭
```
1. 이미지 파일(JPG, PNG 등)을 준비
2. 드래그 앤 드롭 영역으로 파일을 드래그
3. 파일 업로드 진행률 확인
4. 업로드 완료 후 미리보기 확인
```

#### 테스트 시나리오 2: 파일 선택
```
1. "파일 선택" 버튼 클릭
2. 이미지 파일 선택 (최대 5개)
3. 업로드 진행률 확인
4. 미리보기에서 X 버튼으로 이미지 제거 테스트
```

#### 테스트 시나리오 3: 차량 등록
```
1. 이미지 업로드 완료
2. 나머지 차량 정보 입력
3. "등록" 버튼 클릭
4. 차량 목록에서 이미지 정상 표시 확인
```

### 2. 네트워크 확인

**개발자 도구 (F12)** → **Network 탭**:

```
POST /api/upload-image
Status: 200 OK
Response:
{
  "success": true,
  "url": "https://xxxxx.public.blob.vercel-storage.com/rentcar/1729680000000-abc123.jpg"
}
```

### 3. Vercel Blob 대시보드 확인

1. Vercel 대시보드 → Storage → Blob Store 선택
2. **Browse** 탭에서 업로드된 이미지 확인
3. `rentcar/` 폴더 내에 이미지 파일 존재 확인

---

## 📂 이미지 저장 구조

### 파일명 형식
```
{category}/{timestamp}-{random}.{extension}

예시:
rentcar/1729680123456-abc123.jpg
rentcar/1729680234567-def456.png
rentcar/1729680345678-ghi789.webp
```

### URL 형식
```
https://xxxxxxxxxxxxx.public.blob.vercel-storage.com/rentcar/1729680123456-abc123.jpg
```

---

## 🔒 보안 고려사항

### 1. 파일 크기 제한 ✅
- 클라이언트: 10MB
- 서버: 10MB
- 이유: DoS 공격 방지

### 2. 파일 타입 검증 ✅
```javascript
// 클라이언트 (ImageUploader.tsx)
accept="image/*"

// 서버에서 추가 검증 권장
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
if (!allowedTypes.includes(file.mimetype)) {
  return error;
}
```

### 3. 파일명 중복 방지 ✅
```javascript
// 타임스탬프 + 랜덤 문자열
const timestamp = Date.now();
const randomString = Math.random().toString(36).substring(2, 8);
const filename = `${category}/${timestamp}-${randomString}.${extension}`;
```

### 4. Public 액세스 ✅
```javascript
const blob = await put(filename, fileBuffer, {
  access: 'public',  // 공개 URL로 접근 가능
  addRandomSuffix: false,
});
```

---

## 🐛 트러블슈팅

### 문제 1: "BLOB_READ_WRITE_TOKEN이 없습니다" 에러

**증상**:
```
Error: No BLOB_READ_WRITE_TOKEN environment variable found
```

**해결**:
1. `.env` 파일에 토큰 추가 (위 Step 4-1 참고)
2. 개발 서버 재시작 (`npm run dev`)
3. `VITE_` 접두사 제거 확인

---

### 문제 2: "formidable 파싱 실패" 에러

**증상**:
```
Error: Unexpected field
```

**해결**:
1. `formidable` 버전 확인: `npm list formidable`
2. 현재 버전 (3.5.4)이면 정상
3. 업그레이드 필요 시: `npm install formidable@latest`

---

### 문제 3: "업로드는 되는데 이미지가 안 보임"

**증상**:
- 네트워크 탭에서 200 OK
- 하지만 미리보기에서 이미지 깨짐

**해결**:
1. Blob Store URL 확인:
   ```javascript
   console.log('Uploaded URL:', data.url);
   ```
2. CORS 문제 확인 (Vercel Blob은 기본적으로 CORS 허용)
3. 브라우저 콘솔에서 네트워크 오류 확인

---

### 문제 4: "10MB 이상 파일 업로드 불가"

**증상**:
```
Error: File size exceeds maximum allowed (10MB)
```

**해결**:
- 이것은 **의도된 제한**입니다
- 파일 크기 증가 필요 시:
  1. `ImageUploader.tsx:49` 수정
  2. `upload-image.js:24` 수정
  3. Vercel Blob 요금제 확인 (무료: 500MB, Pro: 1GB+)

---

### 문제 5: "Vercel 배포 후 업로드 실패"

**증상**:
- 로컬에서는 정상
- 프로덕션에서 500 에러

**해결**:
1. Vercel 환경 변수 확인:
   - 대시보드 → Settings → Environment Variables
   - `BLOB_READ_WRITE_TOKEN` 존재 확인
2. Blob Store 연결 확인:
   - Storage 탭 → Blob Store → Connected Projects
3. 배포 로그 확인:
   - Deployments → 최신 배포 → Function Logs

---

## 💰 Vercel Blob 요금제

### 무료 플랜 (Hobby)
- 저장 용량: **500MB**
- 월 전송량: **5GB**
- 충분한 규모: 약 500~1000장 이미지

### Pro 플랜 ($20/월)
- 저장 용량: **1GB** (추가 $0.15/GB)
- 월 전송량: **100GB**
- 프로덕션 권장

### 비용 예측 (렌트카 165대)
```
1. 차량당 평균 3장 이미지
2. 이미지당 평균 1MB
3. 총 저장 용량: 165 × 3 × 1MB = 495MB

✅ 무료 플랜으로 충분 (500MB 이내)
```

---

## 📋 체크리스트

배포 전 확인 사항:

```
[✅] @vercel/blob 패키지 설치 확인
[✅] formidable 패키지 설치 확인
[✅] ImageUploader 컴포넌트 구현 완료
[✅] /api/upload-image API 구현 완료
[✅] 벤더 대시보드 통합 완료
[⚠️] .env에 BLOB_READ_WRITE_TOKEN 설정 (필수!)
[⚠️] 개발 서버 재시작
[⚠️] 로컬에서 이미지 업로드 테스트
[⚠️] Vercel에 Blob Store 연결
[⚠️] 프로덕션 환경 변수 확인
```

---

## 🎯 빠른 시작 (5분 가이드)

### 1분: Vercel Blob Store 생성
1. https://vercel.com/dashboard 접속
2. Storage → Create Database → Blob
3. `travleap-images` 이름으로 생성

### 2분: 토큰 복사 및 설정
1. 생성 완료 후 토큰 복사
2. `.env` 파일 열기
3. `BLOB_READ_WRITE_TOKEN=복사한_토큰` 추가

### 1분: 개발 서버 재시작
```bash
# Ctrl+C로 중지
npm run dev
```

### 1분: 테스트
1. 브라우저에서 벤더 대시보드 접속
2. 차량 추가 → 이미지 업로드
3. 드래그 앤 드롭으로 이미지 업로드
4. ✅ 성공!

---

## 📞 추가 지원

### Vercel 공식 문서
- Blob Storage: https://vercel.com/docs/storage/vercel-blob
- 가격: https://vercel.com/docs/storage/vercel-blob/usage-and-pricing

### 코드 위치
- 컴포넌트: `components/ui/ImageUploader.tsx`
- API: `pages/api/upload-image.js`
- 사용 예시: `components/VendorDashboardPageEnhanced.tsx` (1228번째 줄)

---

## 🎉 완료 후 확인사항

이미지 업로드가 정상 작동하면:

1. **차량 목록에서 이미지 표시 확인**
   - 썸네일 이미지 정상 표시
   - 차량 상세 페이지 이미지 정상 표시

2. **데이터베이스 확인**
   ```sql
   SELECT id, display_name, images
   FROM rentcar_vehicles
   WHERE images IS NOT NULL AND images != '[]';
   ```

3. **Vercel Blob 대시보드 확인**
   - Browse 탭에서 `rentcar/` 폴더 내 이미지 파일 확인

4. **프로덕션 배포**
   ```bash
   git add .
   git commit -m "feat: Enable real image upload with Vercel Blob"
   git push
   ```

---

**설정 완료 시간**: 약 5분
**난이도**: ⭐⭐☆☆☆ (쉬움)
**필수 여부**: ⭐⭐⭐⭐⭐ (매우 중요)

이미지 업로드는 사용자 경험에 매우 중요한 기능입니다!

---

**작성자**: AI 어시스턴트
**최종 업데이트**: 2025-10-23
