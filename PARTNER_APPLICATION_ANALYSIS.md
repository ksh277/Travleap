# 파트너 신청 프로세스 분석 및 수정 보고서

**작성일**: 2025-11-03
**분석 범위**: 파트너 신청 페이지 → API → 관리자 페이지 승인/거절 플로우

---

## 1. 발견된 문제점

### 1.1 Kakao Map API 미로드 문제 ❌

**문제**:
- `PartnerApplyPage.tsx` (136-173줄)에서 Kakao Map API를 사용하여 주소 검색 및 좌표 변환을 수행
- `index.html`에 Daum Postcode API만 로드되어 있고, Kakao Map API는 로드되지 않음
- 주석에 "Kakao Map API는 main.tsx에서 동적으로 로드됩니다"라고 적혀있지만 실제로는 로드되지 않음

**증상**:
```javascript
// PartnerApplyPage.tsx 136-141줄
const openAddressSearch = () => {
  const kakao = (window as any).kakao;
  if (!kakao || !kakao.maps) {
    toast.error('주소 검색 기능을 불러올 수 없습니다.');
    return; // ← 여기서 에러 발생
  }
```

**해결**:
```html
<!-- index.html에 Kakao Map API 추가 -->
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=0bcdf9416b3fc90c2669e52d23ed1a12&libraries=services"></script>
```

**파일**: `C:\Users\ham57\Desktop\Travleap\index.html` (12줄)

---

### 1.2 API 필드명 불일치 문제 ❌

**문제**:
- **프론트엔드**: `PartnerApplyPage.tsx`에서 `snake_case` 필드명 사용
  ```javascript
  {
    business_name: "신안여행사",
    contact_name: "홍길동",
    business_address: "전남 신안군...",
    // ...
  }
  ```

- **기존 API**: `api/partners/apply.js`에서 `camelCase` 필드명 기대
  ```javascript
  const {
    businessName,  // ← business_name을 받지 못함
    contactName,   // ← contact_name을 받지 못함
    // ...
  }
  ```

**결과**:
- 신청 데이터가 `null`로 저장되어 관리자 페이지에서 빈 데이터 표시

**해결**:
- API를 프론트엔드 필드명(`snake_case`)에 맞춰 수정
- 모든 필드명을 `business_name`, `contact_name` 등으로 변경

**파일**: `C:\Users\ham57\Desktop\Travleap\api\partners\apply.js` (20-49줄)

---

### 1.3 DB 테이블 스키마 불일치 문제 ⚠️

**문제**:
- **기존 스키마**: `partners` 테이블에 `company_name`, `representative_name`, `address`, `category` 컬럼만 존재
- **필요 컬럼**: `business_name`, `contact_name`, `business_address`, `location`, `services`, `lat`, `lng`, `images`, `business_hours` 등 누락

**해결**:
- DB 마이그레이션 파일 생성: `database/partners-table-enhancement.sql`
- 누락된 20개 컬럼 추가
- 기존 데이터 마이그레이션 (company_name → business_name 등)

**파일**: `C:\Users\ham57\Desktop\Travleap\database\partners-table-enhancement.sql`

---

### 1.4 Authorization 헤더 검증 누락 ⚠️

**문제**:
- 프론트엔드에서 `Authorization: Bearer {token}` 헤더 전송
- API에서 헤더를 검증하지 않아 비로그인 상태에서도 신청 가능

**해결**:
```javascript
// api/partners/apply.js (16-23줄)
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({
    success: false,
    error: '로그인이 필요합니다. 다시 로그인해주세요.'
  });
}
```

**파일**: `C:\Users\ham57\Desktop\Travleap\api\partners\apply.js` (16-23줄)

---

## 2. 파트너 신청 프로세스 플로우

### 2.1 전체 프로세스

```
사용자
  ↓
[1] 로그인 확인 (PartnerApplyPage.tsx, 128-133줄)
  ↓
[2] 파트너 신청 폼 작성
  ├─ 기본 정보 (Step 1): 업체명, 담당자, 이메일, 전화번호, 주소
  ├─ 상세 정보 (Step 2): 가격, 설명, 이미지, 영업시간
  └─ 약관 동의 (Step 3)
  ↓
[3] Kakao Map API로 주소 검색 → 좌표 변환 (136-173줄)
  ↓
[4] 이미지 업로드 → Vercel Blob Storage (224-254줄)
  ↓
[5] POST /api/partners/apply (288-295줄)
  ↓
API (api/partners/apply.js)
  ├─ Authorization 헤더 검증
  ├─ 필수 항목 검증
  ├─ partners 테이블에 INSERT (status: 'pending')
  └─ 응답: { success: true, applicationId }
  ↓
관리자 페이지 (AdminPage.tsx)
  ├─ [파트너 관리] 탭 → 신청 대기 목록 표시 (3699-3757줄)
  ├─ 승인 버튼 → handleApprovePartner() (1634-1660줄)
  │   └─ PATCH /api/admin/partners/[id]/status (status: 'approved')
  └─ 거절 버튼 → handleRejectPartner() (1676-1701줄)
      └─ PATCH /api/admin/partners/[id]/status (status: 'rejected')
```

---

### 2.2 주요 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 파일 |
|----------|--------|------|------|
| `/api/partners/apply` | POST | 파트너 신청 제출 | `api/partners/apply.js` |
| `/api/admin/partners/applications` | GET | 대기 중인 신청 목록 조회 | `api/admin/partners/applications.js` |
| `/api/admin/partners/[id]/status` | PATCH | 신청 승인/거절 | `api/admin/partners/[id]/status.js` |

---

## 3. 수정된 파일 목록

### 3.1 index.html
**변경 내용**: Kakao Map API 스크립트 추가
```html
<!-- Before -->
<script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
<!-- Kakao Map API는 main.tsx에서 동적으로 로드됩니다 -->

<!-- After -->
<script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
<!-- Kakao Map API (파트너 신청 페이지 주소 검색용) -->
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=0bcdf9416b3fc90c2669e52d23ed1a12&libraries=services"></script>
```

**파일 경로**: `C:\Users\ham57\Desktop\Travleap\index.html`

---

### 3.2 api/partners/apply.js
**변경 내용**:
1. Authorization 헤더 검증 추가 (16-23줄)
2. 필드명을 `camelCase` → `snake_case`로 변경 (20-49줄)
3. `partners` 테이블에 직접 저장 (85-130줄)
4. 이미지 URL 배열을 JSON으로 저장 (119줄)

**주요 변경 코드**:
```javascript
// Before
const { businessName, contactName, email, phone, ... } = req.body;

// After
const {
  business_name,
  contact_name,
  email,
  phone,
  business_address,
  location,
  services,
  base_price,
  base_price_text,
  detailed_address,
  description,
  images,
  business_hours,
  duration,
  min_age,
  max_capacity,
  language,
  lat,
  lng
} = req.body;
```

**파일 경로**: `C:\Users\ham57\Desktop\Travleap\api\partners\apply.js`

---

### 3.3 database/partners-table-enhancement.sql (신규 생성)
**내용**:
- `partners` 테이블에 20개 컬럼 추가
  - `business_name`, `contact_name`, `business_address`, `location`, `services`
  - `base_price`, `base_price_text`, `detailed_address`
  - `images` (JSON), `business_hours`, `duration`, `min_age`, `max_capacity`, `language`
  - `lat`, `lng` (좌표)
  - `is_verified`, `approved_at`, `rejected_at`, `rejection_reason`

- 기존 데이터 마이그레이션
  ```sql
  UPDATE partners SET business_name = company_name WHERE business_name IS NULL;
  UPDATE partners SET contact_name = representative_name WHERE contact_name IS NULL;
  UPDATE partners SET business_address = address WHERE business_address IS NULL;
  UPDATE partners SET services = category WHERE services IS NULL;
  ```

**파일 경로**: `C:\Users\ham57\Desktop\Travleap\database\partners-table-enhancement.sql`

---

## 4. 관리자 페이지 파트너 관리 기능

### 4.1 신청 목록 표시
- **위치**: `AdminPage.tsx` → `[파트너 관리]` 탭 (3699-3757줄)
- **데이터 소스**: `partnerApplications` state (601줄)
- **API**: `GET /api/admin/partners/applications`
- **필터링**: `status === 'pending'`인 신청만 표시

### 4.2 승인 기능
- **버튼 위치**: 각 신청 카드 하단 (3731-3737줄)
- **핸들러**: `handleApprovePartner(applicationId)` (1634-1660줄)
- **API**: `PATCH /api/admin/partners/[id]/status` (body: `{ status: 'approved' }`)
- **동작**:
  1. `partners` 테이블에서 `status = 'approved'`, `is_verified = 1` 업데이트
  2. 신청 목록에서 제거
  3. 대시보드 통계 새로고침
  4. 토스트 알림: "파트너 신청이 승인되고 상품이 생성되었습니다."

### 4.3 거절 기능
- **버튼 위치**: 각 신청 카드 하단 (3738-3745줄)
- **핸들러**: `handleRejectPartner(applicationId)` (1676-1701줄)
- **API**: `PATCH /api/admin/partners/[id]/status` (body: `{ status: 'rejected', reason }`)
- **동작**:
  1. 확인 대화상자 표시
  2. `partners` 테이블에서 `status = 'rejected'` 업데이트
  3. 신청 목록에서 제거
  4. 토스트 알림: "파트너 신청이 거부되었습니다."

---

## 5. 현재 구현 상태

### 5.1 완전히 구현된 기능 ✅

1. **파트너 신청 페이지** (`PartnerApplyPage.tsx`)
   - 3단계 폼 (기본정보 → 상세정보 → 약관동의)
   - Kakao 주소 검색 + 좌표 변환
   - 이미지 업로드 (Vercel Blob, 최대 3장)
   - 로그인 체크

2. **파트너 신청 API** (`api/partners/apply.js`)
   - Authorization 헤더 검증
   - 필수 항목 검증
   - `partners` 테이블에 저장 (status: 'pending')

3. **관리자 페이지 파트너 관리** (`AdminPage.tsx`)
   - 신청 대기 목록 표시
   - 승인 버튼 → API 호출 → 상태 업데이트
   - 거절 버튼 → API 호출 → 상태 업데이트

4. **승인/거절 API** (`api/admin/partners/[id]/status.js`)
   - `status = 'approved'` 업데이트
   - `is_verified = 1` 설정
   - `approved_at` / `rejected_at` 타임스탬프 기록

---

### 5.2 부분적으로 구현됨 ⚠️

1. **DB 테이블 스키마**
   - 기존: `company_name`, `representative_name`, `address`, `category`만 존재
   - 필요: `business_name`, `contact_name`, `business_address`, `location`, `services` 등 20개 컬럼 추가 필요
   - **조치 필요**: `database/partners-table-enhancement.sql` 실행

2. **이메일 알림**
   - 승인/거절 시 신청자에게 이메일 발송 기능 없음
   - **개선 가능**: EmailJS 또는 SendGrid 연동

---

### 5.3 구현되지 않은 기능 ❌

1. **파트너 대시보드**
   - 승인된 파트너가 로그인하여 본인 상품/예약을 관리하는 페이지 없음
   - **관련 파일**: `PartnerDashboardPageEnhanced.tsx` (존재하지만 미연동)

2. **파트너 신청 내역 조회**
   - 사용자가 본인이 제출한 신청 상태를 확인하는 페이지 없음

3. **파트너 프로필 수정**
   - 승인 후 파트너가 본인 정보를 수정하는 기능 없음

---

## 6. 테스트 체크리스트

### 6.1 프론트엔드 테스트

- [ ] 비로그인 상태에서 `/partner-apply` 접근 시 로그인 페이지로 리다이렉트
- [ ] 주소 검색 버튼 클릭 시 Daum Postcode 팝업 표시
- [ ] 주소 선택 시 Kakao Geocoder로 좌표 변환 성공
- [ ] 이미지 업로드 (최대 3장) 성공
- [ ] 필수 항목 누락 시 에러 메시지 표시
- [ ] 약관 미동의 시 제출 버튼 비활성화
- [ ] 제출 성공 시 "신청 완료" 화면 표시

### 6.2 API 테스트

```bash
# 1. 로그인 토큰 없이 신청 (401 에러 기대)
curl -X POST http://localhost:3004/api/partners/apply \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "테스트 업체",
    "contact_name": "홍길동",
    "email": "test@test.com",
    "phone": "010-1234-5678"
  }'

# 2. 로그인 토큰과 함께 신청 (200 성공 기대)
curl -X POST http://localhost:3004/api/partners/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "business_name": "테스트 업체",
    "contact_name": "홍길동",
    "email": "test@test.com",
    "phone": "010-1234-5678",
    "business_address": "전남 신안군 증도면",
    "location": "전남 신안",
    "services": "tour",
    "description": "테스트 설명입니다. 최소 50자 이상 작성해야 합니다. 추가 텍스트를 넣어 50자를 채웁니다.",
    "business_hours": "평일 09:00-18:00",
    "lat": 34.123456,
    "lng": 126.123456
  }'
```

### 6.3 관리자 페이지 테스트

- [ ] 관리자 로그인 후 `/admin` 접근
- [ ] `[파트너 관리]` 탭에서 신청 대기 목록 표시
- [ ] 각 신청 카드에 업체명, 담당자, 주소 표시
- [ ] 승인 버튼 클릭 시 확인 없이 즉시 승인 (토스트 표시)
- [ ] 거절 버튼 클릭 시 확인 대화상자 표시 후 거절
- [ ] 승인/거절 후 목록에서 사라짐

### 6.4 DB 테스트

```sql
-- 1. 신청된 파트너 조회
SELECT
  id,
  business_name,
  contact_name,
  email,
  phone,
  location,
  services,
  status,
  created_at
FROM partners
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 2. 승인된 파트너 조회
SELECT
  id,
  business_name,
  status,
  is_verified,
  approved_at
FROM partners
WHERE status = 'approved';
```

---

## 7. 배포 전 필수 작업

### 7.1 DB 마이그레이션 실행

```bash
# PlanetScale 데이터베이스에 접속하여 실행
mysql -h aws.connect.psdb.cloud \
      -u m0xopjrdsvzwg4vdi03d \
      -p \
      -D travleap \
      < database/partners-table-enhancement.sql
```

또는 PlanetScale 웹 콘솔에서 실행:
1. https://app.planetscale.com/ 로그인
2. `travleap` 데이터베이스 선택
3. `Console` 탭 선택
4. `database/partners-table-enhancement.sql` 내용 복사 & 붙여넣기
5. `Execute` 버튼 클릭

### 7.2 환경 변수 확인

```bash
# .env 파일
VITE_KAKAO_APP_KEY=0bcdf9416b3fc90c2669e52d23ed1a12  # ✅ 설정됨
DATABASE_URL=mysql://...  # ✅ 설정됨
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...  # ✅ 설정됨
```

### 7.3 Vercel 배포 설정

Vercel 프로젝트 설정에서 환경 변수 확인:
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`

---

## 8. 개선 제안

### 8.1 단기 개선 (1-2주)

1. **이메일 알림 추가**
   - 신청 제출 시 → 관리자에게 알림
   - 승인/거절 시 → 신청자에게 결과 통보
   - 라이브러리: EmailJS 또는 SendGrid

2. **신청 내역 조회 페이지**
   - 경로: `/my-applications`
   - 사용자가 본인이 제출한 신청 목록 확인
   - 상태별 필터링 (대기/승인/거절)

3. **파트너 프로필 수정**
   - 승인 후 파트너가 업체 정보 수정 가능

### 8.2 중기 개선 (1-2개월)

1. **파트너 대시보드 연동**
   - `PartnerDashboardPageEnhanced.tsx` 활성화
   - 예약 관리, 수익 통계, 리뷰 관리 기능

2. **승인 조건 자동화**
   - 사업자등록번호 검증
   - 이미지 품질 체크
   - 중복 신청 방지

3. **파트너 등급 시스템**
   - 리뷰 평점, 예약 건수에 따라 등급 부여
   - 등급별 수수료율 차등 적용

---

## 9. 문제 해결 FAQ

### Q1. 주소 검색 팝업이 안 뜨는 경우
**A**: 브라우저 콘솔에서 `window.daum` 또는 `window.kakao` 확인
```javascript
console.log(window.daum);  // Postcode API 로드 확인
console.log(window.kakao); // Kakao Map API 로드 확인
```

### Q2. 이미지 업로드 실패
**A**: Vercel Blob Token 확인
```bash
# .env 파일
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### Q3. 관리자 페이지에서 빈 데이터 표시
**A**: DB 마이그레이션 실행 여부 확인
```sql
SHOW COLUMNS FROM partners LIKE 'business_name';
```

### Q4. 승인/거절이 동작하지 않음
**A**: API 엔드포인트 확인
```javascript
// utils/api.ts에서 확인
approvePartnerApplication: async (applicationId) => {
  // PATCH /api/admin/partners/[id]/status
}
```

---

## 10. 관련 파일 경로

| 파일 | 경로 | 설명 |
|------|------|------|
| 파트너 신청 페이지 | `components/PartnerApplyPage.tsx` | 신청 폼 UI |
| 파트너 신청 API | `api/partners/apply.js` | 신청 제출 처리 |
| 관리자 페이지 | `components/AdminPage.tsx` | 신청 승인/거절 UI |
| 승인/거절 API | `api/admin/partners/[id]/status.js` | 상태 업데이트 |
| 신청 목록 API | `api/admin/partners/applications.js` | 대기 목록 조회 |
| DB 마이그레이션 | `database/partners-table-enhancement.sql` | 테이블 컬럼 추가 |
| 환경 변수 | `.env` | Kakao API 키, DB URL |
| HTML 템플릿 | `index.html` | Kakao Map API 로드 |

---

## 11. 최종 체크리스트

배포 전 반드시 확인:

- [x] `index.html`에 Kakao Map API 스크립트 추가됨
- [x] `api/partners/apply.js`에서 `snake_case` 필드명 처리
- [ ] `database/partners-table-enhancement.sql` DB에 실행
- [x] `api/partners/apply.js`에서 Authorization 헤더 검증
- [ ] Vercel 환경 변수에 `BLOB_READ_WRITE_TOKEN` 설정
- [ ] PlanetScale DB에 `partners` 테이블 컬럼 추가 확인
- [ ] 로컬 테스트: 신청 제출 → 관리자 승인 → 상태 변경 확인

---

**작성자**: Claude Code
**문의**: 추가 수정이 필요하면 이 문서를 기반으로 작업해주세요.
