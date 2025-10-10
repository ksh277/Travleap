# 관리자 페이지 상품 추가 가이드

## 목차

1. [개요](#개요)
2. [숙박 상품 추가 (PMS 연동)](#숙박-상품-추가-pms-연동)
3. [렌트카 공급업체 등록](#렌트카-공급업체-등록)
4. [수동 상품 추가](#수동-상품-추가)
5. [데이터 흐름](#데이터-흐름)
6. [DB 테이블 구조](#db-테이블-구조)

---

## 개요

관리자 페이지에서 상품을 추가하는 3가지 방법:

| 방법 | 설명 | 사용 케이스 |
|------|------|-------------|
| **PMS 연동** | 숙박업체 PMS API에서 자동으로 데이터 불러오기 | 호텔, 펜션, 게스트하우스 등 |
| **렌트카 API 연동** | 렌트카 공급업체 API 설정 | 렌트카 (실시간 검색용) |
| **수동 입력** | 직접 폼에 입력 | 투어, 액티비티, 음식점 등 |

---

## 숙박 상품 추가 (PMS 연동)

### 1. UI 플로우

```
관리자 페이지 → 상품 관리 탭 → "상품 추가" 버튼
  ↓
카테고리 선택: "숙박"
  ↓
"PMS에서 불러오기" 버튼 클릭
  ↓
PMSIntegrationModal 열림
  ↓
[입력]
- PMS 공급업체: CloudBeds / Opera / StayNTouch / Mews
- 호텔 ID: hotel_123
- API Key: your_api_key_here
  ↓
"데이터 불러오기" 클릭
  ↓
[백엔드] fetchHotelDataFromPMS() 실행
  ↓
[PMS API 호출]
- GET /hotels/{hotelId}/roomTypes
- GET /hotels/{hotelId}/inventory (향후 30일)
- GET /hotels/{hotelId}/rates (향후 30일)
  ↓
[데이터 변환] convertPMSDataToFormData()
  ↓
[UI] 객실 정보 미리보기 표시
- 호텔명: Ocean View Hotel
- 위치: 제주시
- 객실 타입 (3개):
  ✓ Deluxe Double Room - 120,000원 (최대 2명)
  ✓ Family Suite - 180,000원 (최대 4명)
  ✓ Ocean View Suite - 250,000원 (최대 2명)
  ↓
"폼에 적용하기" 클릭
  ↓
handlePMSDataLoaded(formData)
  ↓
newProduct 상태 업데이트 (폼 자동 채워짐)
- title: "Ocean View Hotel"
- category: "숙박"
- location: "제주시"
- description: "호텔 설명..."
- images: [url1, url2, ...]
- highlights: ["Deluxe Double Room - 120,000원...", ...]
  ↓
관리자 확인/수정
  ↓
"저장" 버튼 클릭
  ↓
handleAddProduct()
  ↓
[백엔드] saveProductToDB()
  ↓
DB 저장:
1. listings 테이블 (기본 정보)
2. pms_configs 테이블 (PMS 설정)
3. room_types 테이블 (객실 타입)
4. room_media 테이블 (이미지)
5. rate_plans 테이블 (요금)
6. room_inventory 테이블 (30일 재고)
  ↓
✅ 상품 추가 완료!
listing_id 반환
```

### 2. 코드 예시

```tsx
// AdminPage.tsx

// PMS 모달 열기
<Button onClick={() => setIsPMSModalOpen(true)}>
  PMS에서 불러오기
</Button>

// PMS 데이터 로드 시
const handlePMSDataLoaded = (formData: AdminProductFormData) => {
  setNewProduct({
    title: formData.hotelName,
    category: '숙박',
    location: formData.location,
    description: formData.description,
    images: formData.images,
    price: formData.rooms[0]?.price.toString(),
    highlights: formData.rooms.map(room =>
      `${room.roomName} - ${room.price.toLocaleString()}원 (최대 ${room.maxOccupancy}명)`
    ),
  });

  toast.success('✅ PMS 데이터가 폼에 적용되었습니다!');
};

// 저장 시
const handleAddProduct = async () => {
  // ... 유효성 검사 ...

  const listingData = {
    title: newProduct.title,
    category: '숙박',
    // ... 기타 필드 ...
  };

  const result = await db.insert('listings', listingData);

  // PMS 데이터라면 추가로 저장
  if (fromPMS) {
    await saveProductToDB(pmsFormData);
  }

  toast.success('상품이 추가되었습니다!');
};
```

### 3. 실제 DB 저장 내용

**listings 테이블:**
```sql
INSERT INTO listings (
  title, category_id, location, description_md,
  price_from, price_to, images, is_published
) VALUES (
  'Ocean View Hotel',
  2, -- 숙박 카테고리
  '제주시',
  '호텔 설명...',
  120000, -- 최저가
  250000, -- 최고가
  '["url1", "url2"]',
  false -- 관리자 검토 후 활성화
);
```

**pms_configs 테이블:**
```sql
INSERT INTO pms_configs (
  listing_id, vendor, hotel_id, api_key_encrypted,
  polling_enabled, polling_interval_seconds
) VALUES (
  1, -- 위에서 생성된 listing_id
  'cloudbeds',
  'hotel_123',
  'encrypted_key',
  true,
  300 -- 5분마다 폴링
);
```

**room_types 테이블:**
```sql
INSERT INTO room_types (
  listing_id, pms_room_type_id, room_type_name,
  max_occupancy, bed_type, amenities
) VALUES
(1, 'room_deluxe', 'Deluxe Double Room', 2, 'King', '["WiFi", "TV"]'),
(1, 'room_family', 'Family Suite', 4, 'Queen x2', '["WiFi", "TV", "Kitchen"]'),
(1, 'room_ocean', 'Ocean View Suite', 2, 'King', '["WiFi", "TV", "Balcony"]');
```

**room_inventory 테이블 (향후 30일):**
```sql
INSERT INTO room_inventory (room_type_id, date, available, total)
VALUES
(1, '2025-10-11', 5, 10),
(1, '2025-10-12', 5, 10),
-- ... 30일치 ...
(2, '2025-10-11', 3, 5),
-- ...
```

---

## 렌트카 공급업체 등록

### 렌트카는 "상품"이 아닌 "공급업체 설정"

렌트카는 숙박과 달리:
- **실시간 검색 방식** (사용자가 검색할 때마다 API 호출)
- 상품 DB에 저장할 필요 없음
- 공급업체 API 키만 설정하면 됨

### UI 플로우

```
관리자 페이지 → 설정 탭 → "렌트카 공급업체 관리"
  ↓
[입력]
- 공급업체: Rentalcars.com / Sabre / CarTrawler
- API Key: your_api_key
- Affiliate ID: your_affiliate_id
  ↓
"저장" 클릭
  ↓
rentcar_suppliers 테이블에 저장
  ↓
✅ 공급업체 등록 완료!
```

### 사용자 검색 시

```
사용자: 제주도 렌트카 검색 (2025-11-01 ~ 2025-11-03)
  ↓
GET /api/cars/availability
  ↓
CarRentalService.searchCars()
  ↓
모든 등록된 공급업체 API 호출 (병렬)
  ↓
결과 합치고 정렬 (가격순)
  ↓
사용자에게 차량 목록 표시
```

### DB 테이블 (추가 필요)

```sql
CREATE TABLE rentcar_suppliers (
  id SERIAL PRIMARY KEY,
  supplier VARCHAR(50) NOT NULL, -- 'rentalcars', 'sabre', etc
  api_key_encrypted TEXT NOT NULL,
  affiliate_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 수동 상품 추가

일반적인 투어/액티비티 등은 기존 방식대로 수동 입력:

```
관리자 페이지 → 상품 추가
  ↓
[수동 입력]
- 제목
- 카테고리 (여행/음식/관광지 등)
- 가격
- 위치
- 설명
- 이미지 업로드
- ...
  ↓
저장
  ↓
listings 테이블에만 저장
```

---

## 데이터 흐름

### 전체 아키텍처

```
┌─────────────────────────────────────────────┐
│          관리자 페이지 (Admin UI)             │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────┐ │
│  │ PMS 연동    │  │ 렌트카 설정  │  │수동 │ │
│  │ (숙박 전용) │  │ (API 키만)   │  │입력 │ │
│  └──────┬──────┘  └──────┬───────┘  └──┬──┘ │
└─────────┼─────────────────┼─────────────┼────┘
          │                 │             │
          ▼                 ▼             ▼
┌─────────────────────────────────────────────┐
│            백엔드 API Layer                  │
├─────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌─────────────────┐ │
│  │ product-import.ts│  │ api.ts (기본)   │ │
│  │ - importHotel()  │  │ - addListing()  │ │
│  │ - importRentcar()│  │                 │ │
│  └────────┬─────────┘  └─────────────────┘ │
└───────────┼───────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│         Integration Layer                   │
├─────────────────────────────────────────────┤
│  ┌──────────────┐      ┌────────────────┐  │
│  │ PMS Service  │      │ Rentcar Service│  │
│  │ - fetch()    │      │ - config()     │  │
│  │ - save()     │      │                │  │
│  └──────┬───────┘      └────────────────┘  │
└─────────┼──────────────────────────────────┘
          │
     ┌────┴────┐
     ▼         ▼
┌─────────┐ ┌──────────┐
│ PMS API │ │ Database │
│CloudBeds│ │Supabase  │
└─────────┘ └──────────┘
```

---

## DB 테이블 구조

### 숙박 관련 (PMS)

```sql
-- 기본 상품 정보
listings (
  id, title, category_id, location, description_md,
  price_from, price_to, images, is_published, ...
)

-- PMS 설정
pms_configs (
  id, listing_id, vendor, hotel_id, api_key_encrypted,
  polling_enabled, polling_interval_seconds, ...
)

-- 객실 타입
room_types (
  id, listing_id, pms_room_type_id, room_type_name,
  max_occupancy, bed_type, amenities, ...
)

-- 객실 이미지
room_media (
  id, room_type_id, media_url, is_primary, ...
)

-- 요금 플랜
rate_plans (
  id, room_type_id, rate_plan_name, base_price,
  currency, is_refundable, ...
)

-- 날짜별 재고
room_inventory (
  id, room_type_id, date, available, total, ...
)

-- 예약 기록
pms_booking_records (
  id, booking_id, pms_vendor, pms_booking_id,
  status, hold_id, payment_auth_id, ...
)
```

### 렌트카 관련

```sql
-- 공급업체 설정 (상품 없음)
rentcar_suppliers (
  id, supplier, api_key_encrypted, affiliate_id, is_active, ...
)

-- 예약 기록만 저장
car_bookings (
  id, booking_number, user_id, supplier,
  pickup_at, dropoff_at, vehicle_model,
  total_price, booking_status, ...
)

-- 추가 옵션
car_booking_extras (
  id, booking_id, extra_code, extra_name, quantity, price, ...
)
```

---

## 주의사항

### PMS 연동

1. **API 키 보안**: 환경 변수 또는 암호화 저장 필수
2. **폴링 간격**: 5분 (너무 짧으면 API 제한 걸릴 수 있음)
3. **초기 재고**: 향후 30일치만 저장 (폴링으로 자동 갱신)
4. **이미지**: PMS에서 받은 URL을 우리 CDN으로 복사 권장

### 렌트카 연동

1. **실시간 검색**: 상품 DB에 저장하지 않음
2. **rateKey TTL**: 15분 만료되므로 Quote 재검증 필수
3. **공급업체 다중 등록**: 여러 공급업체 동시 검색 가능
4. **이미지 캐싱**: CDN hotlink 제한 대비

### 수동 입력

1. **필수 필드**: title, category, price, location
2. **이미지**: MediaLibrary 사용 권장
3. **다국어**: 한글 우선, 영어는 선택

---

## 문의

- 기술 문의: dev@travleap.com
- PMS 연동 문의: partners@travleap.com
