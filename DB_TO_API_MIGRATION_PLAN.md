# Database Direct Call → API Migration Plan

모든 프론트엔드 컴포넌트의 직접 DB 호출을 API 호출로 변경하는 완전한 계획

## 🚨 문제점

현재 11개의 프론트엔드 컴포넌트가 `database-cloud`를 직접 import해서 DB를 호출하고 있습니다.
이것은 보안상 위험하고, 실제로 브라우저에서 작동하지 않습니다.

### 왜 작동하지 않는가?
```typescript
// ❌ 프론트엔드에서 직접 DB 호출 (현재)
import { db } from '../utils/database-cloud';
const users = await db.query('SELECT * FROM users');
// 문제: 브라우저에서 DB 연결 정보가 노출됨
// 문제: CORS, 인증, 권한 검증 불가능
```

```typescript
// ✅ API 서버를 통한 DB 호출 (수정 후)
const response = await fetch('/api/users');
const users = await response.json();
// 장점: 서버에서만 DB 접근
// 장점: 인증, 권한, 검증 모두 서버에서 처리
```

## 📋 수정 대상 파일 (11개)

### 1. VendorDashboardPageEnhanced.tsx ⭐⭐⭐ (최우선)
**역할:** 업체가 차량을 등록/수정/삭제하는 메인 대시보드
**DB 호출 수:** 18개

#### 필요한 API 엔드포인트:
- `GET /api/vendor/info` - 업체 정보 조회
- `GET /api/vendor/vehicles` - 내 차량 목록
- `POST /api/vendor/vehicles` - 차량 등록
- `PUT /api/vendor/vehicles/:id` - 차량 수정
- `DELETE /api/vendor/vehicles/:id` - 차량 삭제
- `PATCH /api/vendor/vehicles/:id/availability` - 차량 예약 가능/불가 토글
- `GET /api/vendor/bookings` - 내 예약 목록
- `GET /api/vendor/revenue` - 매출 통계
- `PUT /api/vendor/info` - 업체 정보 수정
- `POST /api/vendor/vehicles/bulk` - CSV 대량 등록

#### 현재 DB 호출:
```typescript
Line 184: SELECT * FROM rentcar_vendors WHERE user_id = ?
Line 197: SELECT * FROM rentcar_vehicles WHERE vendor_id = ?
Line 205: SELECT bookings with JOIN listings
Line 228: SELECT revenue with DATE aggregation
Line 374: UPDATE rentcar_vehicles (차량 수정)
Line 414: UPDATE listings (차량 수정 동기화)
Line 444: INSERT INTO rentcar_vehicles (차량 등록)
Line 481: INSERT INTO listings (차량 등록 동기화)
Line 518: DELETE FROM rentcar_vehicles
Line 523: DELETE FROM listings
Line 539: UPDATE rentcar_vehicles SET is_available
Line 546: UPDATE listings SET is_published
Line 613: INSERT INTO rentcar_vehicles (CSV 업로드)
Line 639: INSERT INTO listings (CSV 업로드 동기화)
Line 767: UPDATE rentcar_vendors (업체 정보 수정)
```

---

### 2. VendorDashboardPage.tsx ⭐⭐
**역할:** 구버전 업체 대시보드 (Enhanced 버전 이전)
**상태:** Enhanced 버전 사용 중이면 삭제 가능, 아니면 동일하게 수정

---

### 3. VendorLodgingDashboard.tsx ⭐⭐⭐
**역할:** 숙박 업체 대시보드
**DB 호출:** lodging 관련

#### 필요한 API 엔드포인트:
- `GET /api/vendor/lodging/info` - 숙박 업체 정보
- `GET /api/vendor/lodging/properties` - 내 숙소 목록
- `POST /api/vendor/lodging/properties` - 숙소 등록
- `PUT /api/vendor/lodging/properties/:id` - 숙소 수정
- `DELETE /api/vendor/lodging/properties/:id` - 숙소 삭제
- `GET /api/vendor/lodging/rooms` - 객실 목록
- `POST /api/vendor/lodging/rooms` - 객실 등록
- `PUT /api/vendor/lodging/rooms/:id` - 객실 수정
- `DELETE /api/vendor/lodging/rooms/:id` - 객실 삭제
- `GET /api/vendor/lodging/bookings` - 숙박 예약 목록

---

### 4. AdminPage.tsx ⭐⭐⭐
**역할:** 메인 관리자 페이지 (모든 데이터 관리)
**DB 호출:** listings, partners, bookings, users 등 전체

#### 필요한 API 엔드포인트:
- `GET /api/admin/listings` - 모든 상품 목록
- `POST /api/admin/listings` - 상품 생성
- `PUT /api/admin/listings/:id` - 상품 수정
- `DELETE /api/admin/listings/:id` - 상품 삭제
- `GET /api/admin/partners` - 모든 파트너 목록
- `POST /api/admin/partners` - 파트너 생성
- `PUT /api/admin/partners/:id` - 파트너 수정
- `DELETE /api/admin/partners/:id` - 파트너 삭제
- `POST /api/admin/partners/:id/approve` - 파트너 승인
- `GET /api/admin/bookings` - 모든 예약 목록
- `PUT /api/admin/bookings/:id` - 예약 상태 변경
- `GET /api/admin/users` - 사용자 목록
- `GET /api/admin/stats` - 전체 통계

---

### 5. AdminRentcarPage.tsx ⭐⭐
**역할:** 렌트카 전용 관리자 페이지
**DB 호출:** rentcar_vendors, rentcar_vehicles, bookings

#### 필요한 API 엔드포인트:
- `GET /api/admin/rentcar/vendors` - 모든 렌트카 업체
- `DELETE /api/admin/rentcar/vendors/:id` - 업체 삭제
- `GET /api/admin/rentcar/vehicles` - 모든 차량
- `PUT /api/admin/rentcar/vehicles/:id` - 차량 수정
- `DELETE /api/admin/rentcar/vehicles/:id` - 차량 삭제
- `GET /api/admin/rentcar/bookings` - 렌트카 예약 목록

---

### 6. VendorPMSSettings.tsx ⭐
**역할:** PMS 연동 설정 페이지
**DB 호출:** rentcar_pms_settings

#### 필요한 API 엔드포인트:
- `GET /api/vendor/pms/settings` - PMS 설정 조회
- `POST /api/vendor/pms/settings` - PMS 설정 저장
- `POST /api/vendor/pms/test` - PMS 연동 테스트
- `POST /api/vendor/pms/sync` - 즉시 동기화

---

### 7. VendorPricingSettings.tsx ⭐
**역할:** 요금 정책 설정 페이지
**DB 호출:** rentcar_pricing_policies

#### 필요한 API 엔드포인트:
- `GET /api/vendor/pricing/policies` - 요금 정책 목록
- `POST /api/vendor/pricing/policies` - 요금 정책 생성
- `PUT /api/vendor/pricing/policies/:id` - 요금 정책 수정
- `DELETE /api/vendor/pricing/policies/:id` - 요금 정책 삭제

---

### 8. MyPage.tsx ⭐
**역할:** 사용자 마이페이지
**DB 호출:** users, bookings

#### 필요한 API 엔드포인트:
- `GET /api/user/profile` - 내 프로필
- `PUT /api/user/profile` - 프로필 수정
- `GET /api/user/bookings` - 내 예약 목록
- `DELETE /api/user/bookings/:id` - 예약 취소

---

### 9. PartnerDetailPage.tsx ⭐
**역할:** 파트너 상세 페이지
**DB 호출:** partners, listings

#### 필요한 API 엔드포인트:
- 이미 존재: `GET /api/partners/:id`
- 추가 필요: `GET /api/partners/:id/listings` - 파트너의 상품 목록

---

### 10. MediaManagement.tsx ⭐
**역할:** 미디어 파일 관리
**DB 호출:** media

#### 필요한 API 엔드포인트:
- `GET /api/admin/media` - 미디어 목록
- `POST /api/admin/media` - 미디어 업로드
- `DELETE /api/admin/media/:id` - 미디어 삭제

---

### 11. DBTestComponent.tsx
**역할:** 테스트 컴포넌트
**상태:** 개발용이므로 삭제 또는 무시

---

## 🔄 작업 순서

### Phase 1: API 엔드포인트 생성 (server-api.ts)
1. ✅ Vendor 기본 CRUD (이미 완료)
2. Vendor 차량 관리 API
3. Vendor 예약/매출 조회 API
4. Admin 전체 관리 API
5. Admin 렌트카 관리 API
6. Vendor PMS/Pricing API
7. User API
8. Media API

### Phase 2: 컴포넌트 수정
1. VendorDashboardPageEnhanced.tsx (최우선)
2. VendorLodgingDashboard.tsx
3. AdminPage.tsx
4. AdminRentcarPage.tsx
5. VendorPMSSettings.tsx
6. VendorPricingSettings.tsx
7. MyPage.tsx
8. PartnerDetailPage.tsx
9. MediaManagement.tsx

### Phase 3: 검증
1. 각 페이지별 기능 테스트
2. 권한 검증 테스트
3. 에러 핸들링 테스트
4. 전체 플로우 테스트

---

## ✅ 검증 체크리스트

### VendorDashboardPageEnhanced
- [ ] 업체 정보 로드
- [ ] 차량 목록 로드
- [ ] 차량 등록
- [ ] 차량 수정
- [ ] 차량 삭제
- [ ] 차량 예약 가능/불가 토글
- [ ] CSV 대량 업로드
- [ ] 예약 목록 조회
- [ ] 매출 통계 조회
- [ ] 업체 정보 수정

### AdminPage
- [ ] 모든 상품 조회
- [ ] 상품 생성/수정/삭제
- [ ] 파트너 목록 조회
- [ ] 파트너 승인
- [ ] 예약 목록 조회
- [ ] 사용자 목록 조회
- [ ] 통계 대시보드

### 기타 페이지
- [ ] 각 페이지 기본 기능 작동
- [ ] 권한 검증 (vendor는 자기것만, admin은 전체)
- [ ] 에러 메시지 표시
- [ ] 로딩 상태 표시

---

## 🎯 예상 작업 시간
- API 엔드포인트 생성: 2-3시간
- 컴포넌트 수정: 3-4시간
- 테스트 및 검증: 1-2시간
- **총 예상 시간: 6-9시간**

---

## 📝 작업 시작!

지금부터 한 줄 한 줄 완벽하게 검토하면서 작업을 시작합니다.
