# 🔍 숙박 & 렌트카 시스템 종합 점검 보고서

**점검 일시:** 2025-11-11
**점검 범위:** 렌트카 및 숙박 예약 시스템 전체 (프론트엔드, API, 벤더 대시보드, DB)
**점검 방법:** 코드 리뷰, API 분석, DB 무결성 검증

---

## 📊 전체 요약

| 시스템 | 점수 | 상태 | 주요 문제 |
|--------|------|------|-----------|
| **렌트카 예약** | 🔴 40/100 | 심각 | 차량 상세 API 누락, 필드명 불일치 |
| **렌트카 벤더** | 🟢 85/100 | 우수 | 차량 관리 UI 누락 |
| **숙박 예약** | 🟡 55/100 | 개선 필요 | 데이터 모델 혼재, API 경로 불일치 |
| **숙박 벤더** | 🟡 65/100 | 보통 | 라우팅 문제, 객실 정보 누락 |
| **DB 무결성** | 🟡 70/100 | 보통 | 참조 무결성 위반 3건 |

---

# 🚗 1. 렌트카 예약 시스템

## 🔴 치명적 문제 (즉시 수정 필요)

### 1.1 차량 상세 조회 API 누락
**위치:** `pages/rentcar/[id].tsx:87`
**문제:**
```typescript
const response = await fetch(`/api/rentcar/vehicles?id=${id}`);
```
- 프론트엔드는 `/api/rentcar/vehicles?id=123` 호출
- 하지만 `pages/api/rentcar/vehicles.js`는 `id` 파라미터를 **전혀 처리하지 않음**
- `vendor_id`만 필터링

**영향:**
- 사용자가 차량 상세 페이지에 접근 불가능
- 모든 차량 목록이 반환되거나 빈 데이터 표시

**해결 방법:**
1. `/api/rentcar/vehicles/[id].js` 신규 생성
2. 또는 `vehicles.js`에 id 파라미터 처리 추가

---

### 1.2 필드명 불일치: deposit_amount_krw vs daily_rate_krw
**위치:**
- 프론트엔드: `pages/rentcar/[id].tsx:187, 501, 542`
- 백엔드: `api/rentcar/vehicles.js:59, 93-94`

**문제:**
```typescript
// 프론트엔드
const dailyRate = vehicle?.deposit_amount_krw || 50000;

// 백엔드 API
daily_rate_krw: Number(vehicle.daily_rate_krw || 0)
```

**영향:**
- 가격이 0원으로 표시되거나 하드코딩된 50,000원 표시
- 실제 요금과 표시 요금이 완전히 다름
- 사용자 혼란 및 결제 오류

**해결 방법:**
- 프론트엔드 코드를 `daily_rate_krw`로 통일
- 또는 백엔드 API에서 `deposit_amount_krw` 필드 추가 반환

---

### 1.3 차량 목록 API 응답 구조 불일치
**위치:** `pages/api/rentcar/vehicles.js:47-50`

**문제:**
```javascript
// API 응답
return res.status(200).json({
  success: true,
  data: formatted
});

// 프론트엔드 기대
if (data.success) {
  setVehicles(data.vehicles || []);  // ❌ 'vehicles' 키 없음
  setPagination(data.pagination);     // ❌ 'pagination' 키 없음
}
```

**영향:**
- 차량 목록이 화면에 표시되지 않음
- 페이지네이션 동작 안 함

---

### 1.4 보험 API 인증 문제
**위치:** `pages/rentcar/[id].tsx:100-126`

**문제:**
```typescript
const response = await fetch('/api/admin/insurance', {
  headers: {
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
});
```
- 보험 조회 API가 **JWT 인증 필수**
- 비로그인 사용자는 401 Unauthorized 에러
- 보험 목록을 볼 수 없어 예약 진행 불가

**해결 방법:**
- `/api/rentcar/insurance` 공개 API 생성 (인증 불필요)

---

## 🟠 중요한 문제

### 1.5 추가 옵션(extras) 기능 미구현
**위치:** `pages/rentcar/[id].tsx`, `pages/api/rentcar/bookings.js`

**문제:**
- 상세 페이지에 extras 선택 UI 없음
- GPS, 카시트, WiFi 등 추가 옵션 선택 불가
- 예약 생성 API에서 extras 저장 로직 없음

**영향:**
- 사용자가 편의 옵션을 선택할 수 없음
- extras 요금이 총액에 반영되지 않음

---

### 1.6 가격 계산 로직 불일치
**위치:** `pages/rentcar/[id].tsx:184-191`

**문제:**
```typescript
// 프론트엔드: 단순 계산
const vehicleFee = dailyRate * days;
const totalPrice = vehicleFee + insuranceFee;

// 백엔드: 복잡한 계산 (bookings.js:113-236)
- 일수 + 남은 시간 혼합 계산
- 세금 10% 추가
- 시간제 할증
```

**영향:**
- 화면에 표시되는 가격 ≠ 실제 청구 금액
- 사용자 신뢰도 하락

---

## ✅ 정상 작동하는 부분

1. ✅ 검색 필터링 (차량 등급, 연료, 변속기, 인승, 브랜드, 가격)
2. ✅ 페이지네이션 (20개씩 더보기)
3. ✅ 보험 선택 UI (데이터만 받으면 정상 작동)
4. ✅ 예약 충돌 감지 (60분 버퍼 타임 포함)
5. ✅ 최소 대여 시간 검증 (4시간)
6. ✅ 복호화 로직 (고객 정보 암호화/복호화)

---

# 🏨 2. 숙박 예약 시스템

## 🔴 치명적 문제

### 2.1 데이터 모델 혼재
**문제:**
시스템에 **2개의 독립적인 데이터 모델**이 공존:

#### 모델 A: listings 기반 (현재 사용 중)
```
categories (slug='stay')
  └─ listings (category='stay')
      └─ partners (partner_type='lodging')
```
- `highlights` 필드에 객실 정보를 **문자열로 저장**
- 예: `["Deluxe Double - 120,000원 (최대 2명)"]`

#### 모델 B: accommodation_rooms 기반 (거의 미사용)
```
accommodation_partners
  └─ accommodation_rooms
      └─ accommodation_bookings
```
- 정규화된 테이블 구조
- 하지만 UI에서 **거의 사용하지 않음**

**영향:**
- 프론트엔드와 API가 서로 다른 데이터 구조 기대
- 객실 정보 수정이 어려움 (문자열 파싱 필요)

---

### 2.2 객실 정보 파싱 방식의 문제
**위치:** `components/AccommodationDetailPage.tsx:100-114`

**문제:**
```typescript
const roomTypes: RoomTypeDisplay[] = listing?.highlights
  ?.filter(h => h.includes('원'))
  .map(h => {
    // 형식: "Deluxe Double - 120,000원 (최대 2명)"
    const match = h.match(/(.+?)\s*-\s*([0-9,]+)원\s*\(최대\s*(\d+)명\)/);
    // ...
  })
```

**영향:**
- 객실 정보가 DB가 아닌 **문자열에 하드코딩**
- 가격, 인원 변경 시 문자열을 수동 수정해야 함
- 정규표현식이 맞지 않으면 객실이 표시되지 않음

---

### 2.3 API 엔드포인트 불일치
**위치:** `pages/accommodation/index.tsx:68`, `pages/accommodation/[id].tsx:71`

**문제:**
```typescript
// 프론트엔드 호출
const response = await fetch(`/api/accommodation/listings?${params}`);

// 실제 API
❌ /api/accommodation/listings - 존재하지 않음
✅ /api/accommodations - 업체 목록만 반환
✅ /api/listings/${id} - 일반 listings 조회
```

**영향:**
- Next.js 페이지가 404 에러 발생
- 숙박 목록/상세 페이지 동작 안 함

---

## 🟠 중요한 문제

### 2.4 예약 단위 문제
**위치:** `api/accommodations/book.js`

**문제:**
- 예약이 `listing_id` 기반
- 같은 호텔의 여러 객실을 구분하지 못함
- `room_id` 필드가 없음

**영향:**
- "디럭스룸"을 예약해도 어느 객실인지 알 수 없음
- 객실별 예약 현황 파악 불가

---

### 2.5 가격 계산 부정확
**위치:** `components/AccommodationDetailPage.tsx:224-225`

**문제:**
```typescript
const totalPrice = selectedRoomInfo.price * nights;
```
- 주말 할증료(`weekend_surcharge`) 미적용
- 세금(`tax_amount`) 미적용
- 할인(`discount_amount`) 미적용

**영향:**
- 표시 가격과 실제 결제 금액 불일치

---

## ✅ 정상 작동하는 부분

1. ✅ 리뷰 시스템 (생성, 삭제, 좋아요) - 최근 추가됨
2. ✅ 날짜 겹침 체크 로직
3. ✅ 이미지 갤러리 및 UI
4. ✅ 예약 생성 API (`/api/accommodations/book`)
5. ✅ 파트너별 객실 목록 API

---

# 👨‍💼 3. 렌트카 벤더 대시보드

## ✅ 우수한 부분 (85/100)

### 3.1 완전한 관리 시스템
**파일:** `components/RentcarVendorDashboard.tsx`

**기능:**
1. ✅ 오늘 예약 조회
2. ✅ 바우처 인증
3. ✅ 체크인/체크아웃
4. ✅ 환불/정산 관리
5. ✅ 차량 차단 관리
6. ✅ 옵션 관리 (GPS, 카시트 등)

### 3.2 강력한 권한 체크
- ✅ 모든 API에서 JWT 토큰 검증
- ✅ 벤더 ID로 데이터 필터링
- ✅ 소유권 확인 (수정/삭제 시)

### 3.3 완전한 데이터
- ✅ 예약 데이터에 보험, 옵션, 차량 정보 모두 포함
- ✅ 삭제된 옵션도 `(삭제된 옵션)` 표시

---

## ⚠️ 개선 필요

### 3.1 차량 관리 UI 누락
**문제:**
- `RentcarVendorDashboard.tsx`에 차량 추가/수정/삭제 UI 없음
- 차량 차단, 옵션 관리는 있지만 **차량 자체 등록 불가**

**API는 존재:**
- ✅ `POST /api/vendor/vehicles` - 차량 추가
- ✅ `PUT /api/vendor/vehicles` - 차량 수정
- ✅ `DELETE /api/vendor/vehicles` - 차량 삭제

**해결 방법:**
- 차량 관리 탭 추가 필요

---

### 3.2 이미지 업로드 기능 미구현
**위치:** `pages/api/vendor/vehicles.js:204, 262`

**문제:**
```javascript
const imagesJson = JSON.stringify(image_urls || []);
```
- API는 이미지 URL 배열만 받음
- 실제 파일 업로드 기능 없음
- S3, Cloudinary 등 스토리지 연동 없음

**영향:**
- 벤더가 차량 사진을 추가할 수 없음

---

### 3.3 차량 삭제 시 예약 확인 안 함
**위치:** `pages/api/vendor/vehicles.js:410-449`

**문제:**
```javascript
await connection.execute(
  'DELETE FROM rentcar_vehicles WHERE id = ?',
  [id]
);
```
- 예약이 있는 차량도 삭제 가능
- `rentcar_bookings.vehicle_id`가 FOREIGN KEY 오류 발생 가능

**권장:**
- 예약이 있는 차량은 `is_active = false`로 비활성화

---

# 🏨 4. 숙박 벤더 대시보드

## 🟡 보통 (65/100)

### 4.1 완전한 기능 구현
**파일:** `components/VendorLodgingDashboard.tsx`

**기능:**
1. ✅ 숙소 목록 조회, 추가, 수정, 삭제
2. ✅ 예약 목록 조회
3. ✅ 통계 대시보드
4. ✅ CSV 대량 업로드
5. ✅ PMS 연동 설정

---

## ⚠️ 주요 문제

### 4.1 라우팅 연결 문제
**문제:**
- `App.tsx`에서 `/vendor/lodging` 경로로 등록됨
- 하지만 `pages/vendor/` 디렉토리에 `lodging` 폴더 없음
- 벤더가 이 페이지에 접근할 방법이 불명확

**확인 필요:**
- Header.tsx에서 숙박 벤더용 메뉴 링크 있는지

---

### 4.2 예약 목록에서 객실 정보 누락
**위치:**
- UI: `VendorLodgingDashboard.tsx:767` - `booking.room_name` 표시 시도
- API: `api/vendor/lodging/bookings.js:95-110` - `room_name` 반환 안 함

**문제:**
```typescript
// UI가 기대하는 것
<TableCell>{booking.room_name}</TableCell>

// API가 반환하는 것
{
  id: booking.id,
  lodging_name: booking.listing_title,
  // room_name 없음 ❌
}
```

**영향:**
- 화면에 "undefined" 표시

---

### 4.3 카테고리 혼용 문제
**위치:** 여러 API 파일

| API | 사용하는 값 |
|-----|------------|
| `/api/vendor/lodgings.js` | `category = '숙박'` |
| `/api/accommodations.js` | `partner_type = 'lodging'` |
| `/api/accommodations/book.js` | `category = 'stay'` |

**영향:**
- 데이터 조회 시 일부 누락 가능성
- 예약이 벤더 대시보드에 안 나올 수 있음

---

### 4.4 보안 문제
**위치:** `api/vendor/rooms.js`

**문제:**
- JWT 검증 코드 **없음**
- 누구나 객실 조회/생성 가능

**🔴 긴급 수정 필요**

---

# 💾 5. 데이터베이스 무결성

## 🚗 렌트카 시스템: 85/100 (우수)

### ✅ 정상 항목
1. ✅ 체계적인 테이블 구조 (11개 전용 테이블)
   - rentcar_vendors
   - rentcar_vehicles
   - rentcar_bookings
   - rentcar_insurance
   - rentcar_extras
   - rentcar_booking_extras
   - rentcar_vehicle_blocks
   - 등등

2. ✅ 완전한 데이터 무결성
   - 외래키 참조 정상
   - 고아 레코드 없음

3. ✅ PMS 연동 준비 완료
   - pms_integration_settings 테이블
   - pms_property_mappings 테이블

### ⚠️ 개선점
1. 컬럼명 표준화 필요
   - `total_krw` vs `total_amount`
   - `pickup_at_utc` vs `pickup_date` + `pickup_time`

2. 실제 운영 데이터 부족
   - rentcar_bookings: 1건만 존재
   - 테스트 데이터 추가 필요

---

## 🏨 숙박 시스템: 55/100 (개선 필요)

### 🚨 긴급 문제

#### 1. 참조 무결성 위반 (3건)
**위치:** listings 테이블

```sql
SELECT id, title, partner_id
FROM listings
WHERE partner_id = 238;
```

**결과:**
- ID 369: "디럭스 더블룸" → partner_id 238 (존재하지 않음)
- ID 370: "스위트룸" → partner_id 238 (존재하지 않음)
- ID 371: "스탠다드 트윈룸" → partner_id 238 (존재하지 않음)

**영향:**
- 3개 객실이 부모 파트너 없이 고아 상태
- JOIN 시 NULL 반환

**해결 방법:**
1. partner_id 238을 실제 존재하는 partner_id로 수정
2. 또는 partners 테이블에 ID 238 데이터 생성

---

#### 2. 고아 레코드 (3건)
**위치:** listing_accommodation 테이블

```sql
SELECT * FROM listing_accommodation
WHERE listing_id NOT IN (SELECT id FROM listings);
```

**결과:**
- 3건의 listing_accommodation이 유효하지 않은 listing_id 참조

**해결 방법:**
- 고아 레코드 3건 삭제

---

#### 3. 필수 데이터 부족
**테이블:** room_types, room_inventory

```sql
SELECT COUNT(*) FROM room_types;     -- 결과: 0
SELECT COUNT(*) FROM room_inventory; -- 결과: 0
```

**영향:**
- 객실 타입 정보 없음
- 재고 관리 불가

**해결 방법:**
- 최소 1개 이상의 room_type 데이터 등록
- 각 객실별 room_inventory 설정

---

#### 4. 중복 컬럼
**위치:** bookings 테이블

- `check_in_date` + `checkin_date`
- `check_out_date` + `checkout_date`

**문제:**
- 동일한 정보를 2개 컬럼에 저장
- 데이터 불일치 가능성

**해결 방법:**
- 하나로 통일 (check_in_date 권장)

---

### ⚠️ 일반 문제
1. 위치 정보 누락 (2건)
2. 카테고리 명칭 불일치 (숙박 vs stay)
3. 컬럼명 표준화 필요

---

# 📋 우선순위별 조치사항

## 🔴 P0: 즉시 수정 (1주일 내)

### 렌트카
1. ✅ **차량 상세 API 생성** - `/api/rentcar/vehicles/[id].js`
2. ✅ **필드명 통일** - `deposit_amount_krw` → `daily_rate_krw`
3. ✅ **보험 공개 API 생성** - `/api/rentcar/insurance`
4. ✅ **차량 목록 응답 구조 수정** - `data` → `vehicles`, `pagination` 추가

### 숙박
1. ✅ **참조 무결성 위반 해결** - listings ID 369, 370, 371의 partner_id 수정
2. ✅ **고아 레코드 정리** - listing_accommodation 3건 삭제
3. ✅ **API 경로 수정** - `/api/accommodation/listings` 생성 또는 프론트엔드 수정

### 벤더 대시보드
1. ✅ **보안 취약점 수정** - `api/vendor/rooms.js` JWT 인증 추가
2. ✅ **카테고리 통일** - '숙박' vs 'stay' 일관성 확보

### DB
1. ✅ **필수 데이터 등록** - room_types, room_inventory 데이터 추가

---

## 🟠 P1: 높은 우선순위 (2주일 내)

### 렌트카
1. **extras 기능 구현** - 추가 옵션 선택 UI 및 API
2. **가격 계산 통일** - 프론트엔드와 백엔드 로직 일치
3. **차량 관리 UI 추가** - 벤더 대시보드에 차량 CRUD 탭

### 숙박
1. **데이터 모델 통일** - listings 기반 또는 accommodation_rooms 기반 선택
2. **예약 단위 개선** - room_id 추가하여 객실별 예약 지원
3. **객실 정보 정규화** - highlights 대신 테이블 사용

### 벤더 대시보드
1. **라우팅 개선** - `/pages/vendor/lodging/` 디렉토리 생성
2. **room_name 추가** - 예약 API에서 객실명 반환
3. **이미지 업로드 기능** - S3 연동

### DB
1. **중복 컬럼 제거** - check_in_date vs checkin_date 통일

---

## 🟡 P2: 보통 (1개월 내)

1. 에러 핸들링 개선 - 일관된 에러 응답 형식
2. API 중복 제거 - lodgings vs properties, rooms 통일
3. 컬럼명 표준화 - total_krw vs total_amount 등
4. CSV 업로드 버그 수정 - lodgingId 반환값 수정
5. 차량 삭제 로직 개선 - 예약 있으면 비활성화

---

# 📁 생성된 파일

## 점검 스크립트
- `scripts/check-rentcar-accommodation-integrity.cjs` - 종합 무결성 점검
- `scripts/check-additional-integrity.cjs` - 추가 상세 점검
- `scripts/check-lodging-tables-detail.cjs` - 숙박 테이블 상세 분석
- `scripts/check-partners-table.cjs` - 파트너 테이블 분석

## 보고서
- `DATABASE_INTEGRITY_REPORT.md` - DB 무결성 상세 보고서
- `SYSTEM_INSPECTION_REPORT.md` - 이 종합 보고서

---

# 🎯 결론

## 렌트카 시스템
- **예약 시스템:** 🔴 심각한 문제 - 기본 기능이 작동하지 않음
- **벤더 대시보드:** 🟢 우수 - 대부분 정상 작동
- **우선 조치:** 차량 상세 API, 필드명 통일, 보험 API 생성

## 숙박 시스템
- **예약 시스템:** 🟡 개선 필요 - 데이터 모델 혼재
- **벤더 대시보드:** 🟡 보통 - 라우팅과 데이터 누락 문제
- **우선 조치:** 참조 무결성 수정, API 경로 통일, 객실 정보 정규화

## 데이터베이스
- **렌트카:** 🟢 우수 (85/100)
- **숙박:** 🟡 개선 필요 (55/100) - 참조 무결성 위반 수정 필요

---

**보고서 종료**
**다음 단계:** P0 항목부터 순차적으로 수정 진행