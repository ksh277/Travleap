# 렌트카 시스템 개선 작업 상태
**작업 날짜:** 2025-10-23

---

## ✅ 완료된 작업

### 1. DB 시간당 요금 컬럼 추가
**파일:** [scripts/add-hourly-rates.cjs](scripts/add-hourly-rates.cjs)

- `rentcar_vehicles` 테이블에 `hourly_rate_krw` 컬럼 추가
- 기존 차량들의 시간당 요금 자동 계산 (일일 요금 / 24 * 1.2)
- 샘플 결과:
  ```
  벤츠 GLE 2021: 일일 ₩180,000 / 시간 ₩9,000
  기아 셀토스 2020: 일일 ₩70,000 / 시간 ₩3,000
  아우디 Q5 2023: 일일 ₩104,000 / 시간 ₩5,000
  ```

### 2. 차량 수정 API 구현
**파일:** [pages/api/vendor/rentcar/vehicles/[id].js](pages/api/vendor/rentcar/vehicles/[id].js) (신규 생성)

**기능:**
- `PUT /api/vendor/rentcar/vehicles/{id}` - 차량 정보 수정
- `DELETE /api/vendor/rentcar/vehicles/{id}` - 차량 삭제
- JWT 인증 필수
- 차량 소유권 확인 (다른 업체 차량 수정 불가)
- ENUM 값 자동 매핑 (한글 → 영문)
- 시간당 요금 자동 계산

**ENUM 매핑:**
```javascript
vehicle_class: '경차' → 'compact', 'SUV' → 'suv', '대형' → 'luxury'
fuel_type: '가솔린' → 'gasoline', '전기' → 'electric'
transmission: '자동' → 'automatic', '수동' → 'manual'
```

### 3. 벤더 대시보드 JWT 인증 적용
**파일:** [components/VendorDashboardPageEnhanced.tsx](components/VendorDashboardPageEnhanced.tsx:412-478)

**수정 사항:**
- 차량 저장/수정 시 JWT 토큰 사용 (`Authorization: Bearer ${token}`)
- 차량 삭제 시 JWT 토큰 사용
- `x-user-id` 헤더 제거 (보안 취약점 제거)

**Before:**
```javascript
headers: {
  'Content-Type': 'application/json',
  'x-user-id': user.id.toString()  // 클라이언트가 user ID 전송 (보안 취약)
}
```

**After:**
```javascript
const token = localStorage.getItem('auth_token') || ...;
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`  // JWT 토큰 사용
}
```

### 4. 차량 API에 시간당 요금 추가
**파일:** [pages/api/vendor/vehicles.js](pages/api/vendor/vehicles.js)

**GET 요청:**
- `hourly_rate_krw` 필드 SELECT 쿼리에 추가 (46번 라인)

**POST 요청:**
- `hourly_rate_krw` 파라미터 수신 (101번 라인)
- INSERT 문에 `hourly_rate_krw` 컬럼 추가 (157번 라인)
- 시간당 요금 자동 계산 로직 (129번 라인)

---

## 🚧 진행 중인 작업

### 대시보드에 시간당 요금 필드 추가
**파일:** [components/VendorDashboardPageEnhanced.tsx](components/VendorDashboardPageEnhanced.tsx)

**필요한 수정:**
1. Vehicle 인터페이스에 `hourly_rate_krw` 추가
2. VehicleFormData에 `hourly_rate_krw` 추가
3. 차량 등록/수정 폼에 시간당 요금 입력 필드 추가
4. handleEditVehicle에서 `hourly_rate_krw` 데이터 바인딩

---

## 📋 대기 중인 작업

### 1. 차량 상세 페이지 생성
**목적:** 업체 상세페이지에서 차량 카드 클릭 시 차량 상세정보 표시

**구현 내용:**
- 라우트: `/rentcar/vehicle/{id}`
- 차량 이미지 갤러리
- 차량 스펙 상세 정보
- 시간/일/주/월 단위 렌탈 요금
- 예약 기능 (날짜 선택 → 결제 페이지)
- 리뷰 섹션

### 2. 업체 상세페이지에서 차량 상세 연결
**파일:** [components/pages/RentcarVendorDetailPage.tsx](components/pages/RentcarVendorDetailPage.tsx:506-609)

**수정 내용:**
- 차량 카드에 클릭 이벤트 추가
- 차량 ID로 상세 페이지 네비게이션
- 또는 모달로 상세 정보 표시

### 3. 이미지 업로드 기능
**현재 상태:** 이미지 URL을 직접 입력

**개선 방향:**
- Cloudinary 또는 AWS S3 연동
- 드래그 앤 드롭 이미지 업로드
- 이미지 크롭/리사이즈
- 업체 로고 업로드
- 차량 이미지 업로드 (최대 5개)

### 4. 업체 정보 수정 API
**필요한 API:**
- `PUT /api/vendor/info` - 업체 정보 수정
- `PUT /api/vendor/password` - 비밀번호 변경

**수정 가능 항목:**
- 업체명, 연락처, 주소
- 취소/환불 정책
- 인수/반납 시간
- 업체 설명

### 5. 시간당 요금 표시
**수정 필요 파일:**
- [components/pages/RentcarVendorDetailPage.tsx](components/pages/RentcarVendorDetailPage.tsx) - 차량 카드에 시간당 요금 표시
- [components/cards/RentcarVendorCard.tsx](components/cards/RentcarVendorCard.tsx) - 업체 카드에 시간당 요금 range 표시

**표시 형식:**
```
일일: ₩50,000
시간: ₩3,000  ← 추가
```

---

## 🐛 발견된 문제

### 문제 1: 차량 수정이 안 됨
**원인:** PUT API가 존재하지 않음

**해결:** `pages/api/vendor/rentcar/vehicles/[id].js` 파일 생성 완료 ✅

### 문제 2: 시간당 요금 미지원
**원인:** DB에 컬럼이 없음

**해결:** `hourly_rate_krw` 컬럼 추가 완료 ✅

---

## 📊 데이터베이스 스키마 변경 사항

### rentcar_vehicles 테이블
```sql
ALTER TABLE rentcar_vehicles
ADD COLUMN hourly_rate_krw INT NULL AFTER daily_rate_krw;

UPDATE rentcar_vehicles
SET hourly_rate_krw = ROUND((daily_rate_krw / 24) * 1.2 / 1000) * 1000
WHERE hourly_rate_krw IS NULL;
```

---

## 🔐 보안 개선 사항

### JWT 인증 강화
**Before:**
- 클라이언트가 `x-user-id` 헤더로 사용자 ID 전송
- 클라이언트가 조작 가능 (보안 취약)

**After:**
- JWT 토큰 검증
- 서버에서 `userId` 추출
- DB에서 실제 `vendor_id` 조회
- 클라이언트 입력 무시

### 차량 소유권 확인
**pages/api/vendor/rentcar/vehicles/[id].js:24-42**
```javascript
// 차량 소유권 확인
const vehicleCheck = await connection.execute(
  'SELECT vendor_id FROM rentcar_vehicles WHERE id = ?',
  [id]
);

const vehicleVendorId = vehicleCheck.rows[0].vendor_id;

// 관리자가 아니면서 다른 업체의 차량인 경우 거부
if (!auth.isAdmin && vehicleVendorId !== vendorId) {
  return res.status(403).json({
    success: false,
    message: '이 차량을 수정/삭제할 권한이 없습니다.'
  });
}
```

---

## 🧪 테스트 필요 항목

### 1. 차량 수정 기능
- [ ] 벤더 대시보드 → 렌트카 관리 → 차량 수정 버튼 클릭
- [ ] 차량 정보 변경 (이름, 가격, 이미지 등)
- [ ] 저장 후 변경사항 반영 확인

### 2. 시간당 요금
- [ ] 새 차량 등록 시 시간당 요금 자동 계산
- [ ] 차량 목록에서 시간당 요금 표시 확인
- [ ] 기존 차량의 시간당 요금 조회

### 3. JWT 인증
- [ ] 토큰 없이 API 호출 시 401 에러
- [ ] 다른 업체의 차량 수정 시 403 에러
- [ ] 정상 토큰으로 API 호출 시 성공

---

## 📝 다음 단계

### 우선순위 1 (긴급)
1. ✅ ~~차량 수정 API 구현~~
2. ✅ ~~시간당 요금 컬럼 추가~~
3. 🔄 대시보드에 시간당 요금 필드 UI 추가
4. 차량 상세 페이지 생성

### 우선순위 2 (중요)
5. 이미지 업로드 기능 (Cloudinary)
6. 업체 정보 수정 API
7. 차량/업체 상세페이지에 시간당 요금 표시

### 우선순위 3 (개선)
8. 업체 상세페이지 이미지 갤러리 개선
9. 차량 카드 → 차량 상세 페이지 연결
10. 전체 시스템 통합 테스트

---

## 🎯 목표

사용자가 렌트카를 **시간 단위**로도 대여할 수 있도록 하고, 업체가 자신의 **차량/업체 정보를 자유롭게 수정**할 수 있으며, **이미지를 직접 업로드**할 수 있는 완벽한 렌트카 시스템 구축.

---

## 📞 확인 필요 사항

1. ✅ 시간당 요금 = (일일 요금 / 24) * 1.2 공식 확인
2. 이미지 업로드 서비스 선택 (Cloudinary vs AWS S3)
3. 차량 상세 페이지를 별도 페이지로? 모달로?
4. 업체가 수정 가능한 정보 범위 확인

---

**작성자:** Claude
**마지막 업데이트:** 2025-10-23
**관련 문서:**
- [PMS_165_VEHICLES_TEST_REPORT.md](PMS_165_VEHICLES_TEST_REPORT.md)
- [SECURITY_FIX_REPORT.md](SECURITY_FIX_REPORT.md)
- [VENDOR_DASHBOARD_FIX_REPORT.md](VENDOR_DASHBOARD_FIX_REPORT.md)
