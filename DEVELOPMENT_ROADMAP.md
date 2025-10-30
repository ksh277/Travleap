# 🚀 Travleap 카테고리별 기능 개발 로드맵

> **작성일**: 2025-10-31
> **목적**: 8개 카테고리별 필수 기능 구현을 위한 상세 가이드
> **진행 방식**: 단계별로 천천히, 하나씩 완성

---

## 📋 목차

1. [개발 우선순위 및 전체 계획](#개발-우선순위-및-전체-계획)
2. [Phase 1: 렌트카 - 사고 신고 원터치](#phase-1-렌트카---사고-신고-원터치)
3. [Phase 2: 숙박 - 캘린더 재고 관리](#phase-2-숙박---캘린더-재고-관리)
4. [Phase 3: 여행 - 전체 시스템 구축](#phase-3-여행---전체-시스템-구축)
5. [Phase 4: 음식 - 전체 시스템 구축](#phase-4-음식---전체-시스템-구축)
6. [Phase 5: 체험 - 전체 시스템 구축](#phase-5-체험---전체-시스템-구축)
7. [Phase 6: 행사 - 전체 시스템 구축](#phase-6-행사---전체-시스템-구축)
8. [Phase 7: 관광지 - 입장권 시스템 구축](#phase-7-관광지---입장권-시스템-구축)
9. [개발 체크리스트](#개발-체크리스트)

---

## 개발 우선순위 및 전체 계획

### 🎯 작업 범위 요약

| Phase | 카테고리 | 작업 내용 | 예상 기간 | 난이도 |
|-------|---------|----------|----------|--------|
| 1 | 렌트카 | 사고 신고 원터치 기능 | 2-3일 | ⭐⭐ |
| 2 | 숙박 | 캘린더 재고 관리 시스템 | 3-4일 | ⭐⭐⭐ |
| 3 | 여행 | 패키지/슬롯/바우처 전체 | 7-10일 | ⭐⭐⭐⭐⭐ |
| 4 | 음식 | 메뉴/주문/QR 전체 | 5-7일 | ⭐⭐⭐⭐ |
| 5 | 체험 | 슬롯/면책/날씨 전체 | 5-7일 | ⭐⭐⭐⭐ |
| 6 | 행사 | 좌석/티켓/QR 전체 | 5-7일 | ⭐⭐⭐⭐ |
| 7 | 관광지 | 입장권/게이트검증 | 3-4일 | ⭐⭐⭐ |

**총 예상 기간**: 약 30-42일 (1-1.5개월)

### ⚠️ 주의사항

- **팝업 카테고리**: 현재 상태 유지 (작업 없음)
- **렌트카**: 기존 기능 유지, 사고 신고만 추가
- **상세 페이지**: 여행, 음식, 체험, 행사, 관광지는 카테고리별 커스텀 필요
- **점진적 배포**: 각 Phase 완료 후 테스트 → 배포 → 다음 Phase

---

## Phase 1: 렌트카 - 사고 신고 원터치

### 📌 목표
렌터카 이용 중 사고 발생 시 앱에서 즉시 신고하고, 보험사/업체/관리자에게 자동 알림

### 🗂️ 필요한 작업

#### 1.1 데이터베이스 스키마

**파일**: `database/add-accident-report-system.sql`

```sql
-- 사고 신고 테이블 생성
CREATE TABLE IF NOT EXISTS accident_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- 예약 정보
  booking_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  vendor_id INT NOT NULL,
  user_id INT NOT NULL,

  -- 사고 기본 정보
  report_number VARCHAR(50) UNIQUE NOT NULL COMMENT '신고번호 (ACC-20250131-0001)',
  accident_datetime DATETIME NOT NULL COMMENT '사고 발생 시각',
  location_address VARCHAR(500) COMMENT '사고 장소',
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),

  -- 사고 상세
  accident_type ENUM('collision', 'scratch', 'breakdown', 'theft', 'other') NOT NULL,
  severity ENUM('minor', 'moderate', 'severe') DEFAULT 'minor',
  description TEXT COMMENT '사고 경위 설명',

  -- 상대방 정보 (있는 경우)
  other_party_name VARCHAR(100),
  other_party_phone VARCHAR(50),
  other_party_vehicle VARCHAR(100),
  police_report_filed BOOLEAN DEFAULT FALSE,
  police_report_number VARCHAR(100),

  -- 증거 자료
  photos JSON COMMENT '사고 사진 URLs',
  videos JSON COMMENT '블랙박스/동영상 URLs',

  -- 보험 처리
  insurance_claim_filed BOOLEAN DEFAULT FALSE,
  insurance_company VARCHAR(200),
  insurance_claim_number VARCHAR(100),
  estimated_damage_krw INT,

  -- 처리 상태
  status ENUM('reported', 'investigating', 'claim_filed', 'resolved', 'closed') DEFAULT 'reported',
  handled_by INT COMMENT '처리 담당자 ID',
  resolution_notes TEXT,

  -- 알림 기록
  vendor_notified_at DATETIME,
  insurance_notified_at DATETIME,
  admin_notified_at DATETIME,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_booking (booking_id),
  INDEX idx_vehicle (vehicle_id),
  INDEX idx_user (user_id),
  INDEX idx_report_number (report_number),
  INDEX idx_status (status),
  INDEX idx_accident_date (accident_datetime),

  FOREIGN KEY (booking_id) REFERENCES rentcar_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES rentcar_vehicles(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 1.2 API 엔드포인트

**생성할 파일들**:

1. **`api/rentcar/accident/report.js`** - 사고 신고 접수
```javascript
// POST /api/rentcar/accident/report
// 사고 신고 생성 + 사진 업로드 + 자동 알림 발송
```

2. **`api/rentcar/accident/[reportId].js`** - 사고 조회/수정
```javascript
// GET /api/rentcar/accident/[reportId] - 신고 상세 조회
// PATCH /api/rentcar/accident/[reportId] - 신고 수정 (추가 증거 등)
```

3. **`api/rentcar/accident/list.js`** - 사고 목록
```javascript
// GET /api/rentcar/accident/list?booking_id=123
// 사용자/업체별 사고 내역
```

4. **`api/admin/rentcar/accidents.js`** - 관리자 사고 관리
```javascript
// GET /api/admin/rentcar/accidents - 전체 사고 목록
// PATCH /api/admin/rentcar/accidents/[id]/status - 상태 변경
```

#### 1.3 프론트엔드 컴포넌트

**생성할 파일들**:

1. **`components/rentcar/AccidentReportButton.tsx`**
   - 렌트카 이용 중 화면에 긴급 버튼 표시
   - 클릭 시 사고 신고 폼 모달 오픈

2. **`components/rentcar/AccidentReportForm.tsx`**
   - 사고 타입 선택 (접촉사고/차량 고장/도난 등)
   - 위치 자동 감지 (GPS)
   - 사진/동영상 업로드 (최대 10장)
   - 사고 경위 작성
   - 상대방 정보 입력 (선택)

3. **`components/rentcar/AccidentReportDetail.tsx`**
   - 신고 내역 상세 조회
   - 진행 상태 타임라인
   - 보험사 연락처 표시

4. **`components/admin/AccidentManagement.tsx`**
   - 관리자용 사고 관리 대시보드
   - 상태별 필터링
   - 처리 담당자 배정

#### 1.4 알림 시스템

**파일**: `api/rentcar/accident/notifications.js`

```javascript
// 사고 신고 시 자동 알림 발송
// 1. 업체 담당자 (SMS + 이메일)
// 2. 보험사 (API 연동 또는 이메일)
// 3. 관리자 알림 시스템
// 4. 사용자 SMS (신고번호 전송)
```

#### 1.5 통합 지점

**수정할 파일**:

1. **`components/RentcarBookingsPage.tsx`**
   - "이용 중" 상태에서 "사고 신고" 버튼 추가

2. **`components/pages/RentcarVehicleDetailPage.tsx`**
   - 예약 완료 후 안내 문구에 "사고 시 앱 내 신고 기능 이용" 추가

3. **`components/admin/RentcarManagement.tsx`**
   - "사고 관리" 탭 추가 (선택사항)

---

## Phase 2: 숙박 - 캘린더 재고 관리

### 📌 목표
날짜별 객실 가용성 관리, 동적 가격 설정, 실시간 재고 업데이트

### 🗂️ 필요한 작업

#### 2.1 데이터베이스 스키마

**파일**: `database/add-accommodation-calendar-inventory.sql`

```sql
-- 객실 재고 캘린더 테이블
CREATE TABLE IF NOT EXISTS room_availability (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  room_id INT NOT NULL,
  date DATE NOT NULL,

  -- 재고
  total_rooms INT NOT NULL COMMENT '총 객실 수',
  available_rooms INT NOT NULL COMMENT '예약 가능 객실 수',
  booked_rooms INT DEFAULT 0 COMMENT '예약된 객실 수',
  blocked_rooms INT DEFAULT 0 COMMENT '판매 중지 객실 수',

  -- 동적 가격
  base_price_krw INT NOT NULL,
  weekend_price_krw INT,
  holiday_price_krw INT,
  special_price_krw INT COMMENT '프로모션 특가',

  -- 최소 숙박일
  min_stay_nights INT DEFAULT 1,

  -- 판매 제어
  is_available BOOLEAN DEFAULT TRUE,
  close_out_reason VARCHAR(200) COMMENT '판매 중지 사유 (청소/수리/이벤트)',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_room_date (room_id, date),
  INDEX idx_date (date),
  INDEX idx_available (is_available, available_rooms),
  INDEX idx_room_date_range (room_id, date),

  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 요금 정책 테이블 (시즌별/요일별)
CREATE TABLE IF NOT EXISTS pricing_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,

  room_id INT NOT NULL,
  rule_name VARCHAR(100) NOT NULL,

  -- 적용 기간
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 적용 요일 (비트마스크: 월=1, 화=2, 수=4...)
  day_of_week_mask INT DEFAULT 127 COMMENT '월-일 전체=127',

  -- 가격 조정
  price_type ENUM('fixed', 'markup', 'discount') NOT NULL,
  price_value INT NOT NULL,

  priority INT DEFAULT 0 COMMENT '우선순위 (높을수록 우선)',
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_room (room_id),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_active (is_active),

  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2.2 재고 초기화 스크립트

**파일**: `api/admin/accommodation/init-calendar.js`

```javascript
// POST /api/admin/accommodation/init-calendar
// 특정 기간의 캘린더 재고 자동 생성
// 예: 2025년 전체 또는 향후 1년
```

#### 2.3 API 엔드포인트

**생성할 파일들**:

1. **`api/accommodation/availability.js`**
   - 체크인/체크아웃 날짜로 예약 가능 객실 조회
   - 날짜별 가격 계산

2. **`api/accommodation/calendar/[roomId].js`**
   - 특정 객실의 월별 캘린더 데이터
   - 예약 가능 여부 + 가격 표시

3. **`api/admin/accommodation/inventory.js`**
   - 관리자용 재고 대량 수정
   - 특정 기간 일괄 가격 변경
   - 판매 중지 설정

4. **`api/vendor/accommodation/calendar.js`**
   - 업체용 캘린더 관리
   - 날짜별 재고/가격 수정

#### 2.4 프론트엔드 컴포넌트

**생성할 파일들**:

1. **`components/accommodation/CalendarPicker.tsx`**
   - 체크인/체크아웃 날짜 선택
   - 예약 불가능한 날짜 비활성화
   - 가격 표시

2. **`components/accommodation/RoomAvailabilityCalendar.tsx`**
   - 월별 캘린더 뷰
   - 재고 현황 색상 표시 (여유/보통/마감/불가)

3. **`components/admin/AccommodationInventoryManager.tsx`**
   - 관리자용 캘린더 편집 도구
   - 드래그로 기간 선택 → 가격/재고 일괄 수정

4. **`components/vendor/VendorCalendarManager.tsx`**
   - 업체용 간단한 캘린더 관리

#### 2.5 재고 잠금 시스템

**파일**: `api/accommodation/lock-inventory.js`

```javascript
// 예약 프로세스 중 재고 임시 잠금 (10분)
// 결제 완료 시 확정, 취소/시간초과 시 해제
```

#### 2.6 통합 지점

**수정할 파일**:

1. **`components/pages/HotelDetailPage.tsx`**
   - 캘린더 날짜 선택기 추가
   - 선택한 날짜의 가격 실시간 표시

2. **`components/admin/AccommodationManagement.tsx`**
   - "재고 관리" 탭 추가

3. **`api/accommodation/book.js`**
   - 예약 시 재고 차감 로직 추가
   - 재고 부족 시 예약 차단

---

## Phase 3: 여행 - 전체 시스템 구축

### 📌 목표
투어 패키지 예약, 일정 관리, QR 바우처 발급, 가이드 배정

### 🗂️ 필요한 작업

#### 3.1 데이터베이스 스키마

**파일**: `database/create-tour-system.sql`

```sql
-- 1. 투어 패키지 테이블
CREATE TABLE IF NOT EXISTS tour_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,

  listing_id INT NOT NULL,
  vendor_id INT NOT NULL,

  -- 기본 정보
  package_code VARCHAR(50) UNIQUE NOT NULL,
  package_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- 기간
  duration_days INT NOT NULL COMMENT '2박3일의 3',
  duration_nights INT NOT NULL COMMENT '2박3일의 2',

  -- 일정
  itinerary JSON NOT NULL COMMENT '[{"day": 1, "title": "...", "activities": [...]}]',

  -- 포함/불포함 사항
  included JSON COMMENT '["왕복항공", "호텔", "조식", "입장권"]',
  excluded JSON COMMENT '["점심/저녁", "선택관광", "개인경비"]',

  -- 출발 정보
  meeting_point VARCHAR(500),
  meeting_time TIME,
  departure_location VARCHAR(200) COMMENT '출발지 (서울/부산/제주)',

  -- 인원 및 가격
  min_participants INT DEFAULT 10,
  max_participants INT DEFAULT 30,
  price_adult_krw INT NOT NULL,
  price_child_krw INT,
  price_infant_krw INT,

  -- 이미지
  thumbnail_url VARCHAR(500),
  images JSON,

  -- 추가 정보
  difficulty ENUM('easy', 'moderate', 'hard') DEFAULT 'easy',
  tags JSON COMMENT '["가족여행", "힐링", "SNS명소"]',

  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listing (listing_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_code (package_code),
  INDEX idx_active (is_active),

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 2. 투어 출발 일정 (슬롯)
CREATE TABLE IF NOT EXISTS tour_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,

  package_id INT NOT NULL,

  -- 출발일
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,

  -- 가이드
  guide_id INT COMMENT 'users 테이블의 가이드',
  guide_name VARCHAR(100),
  guide_phone VARCHAR(50),
  guide_language VARCHAR(50) DEFAULT 'ko',

  -- 정원
  max_participants INT NOT NULL,
  current_participants INT DEFAULT 0,
  min_participants INT DEFAULT 10 COMMENT '최소 출발 인원',

  -- 상태
  status ENUM('scheduled', 'confirmed', 'full', 'canceled') DEFAULT 'scheduled',
  cancelation_reason TEXT,

  -- 가격 (동적 조정 가능)
  price_adult_krw INT,
  price_child_krw INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_package (package_id),
  INDEX idx_departure (departure_date, departure_time),
  INDEX idx_status (status),
  INDEX idx_guide (guide_id),

  FOREIGN KEY (package_id) REFERENCES tour_packages(id) ON DELETE CASCADE
);

-- 3. 투어 예약
CREATE TABLE IF NOT EXISTS tour_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,

  booking_number VARCHAR(50) UNIQUE NOT NULL,
  schedule_id INT NOT NULL,
  user_id INT NOT NULL,

  -- 참가자 정보
  participants JSON NOT NULL COMMENT '[{"name": "홍길동", "age": 35, "phone": "010-1234-5678", "type": "adult"}]',
  adult_count INT DEFAULT 0,
  child_count INT DEFAULT 0,
  infant_count INT DEFAULT 0,

  -- 가격
  total_price_krw INT NOT NULL,

  -- 바우처
  voucher_code VARCHAR(50) UNIQUE,
  qr_code TEXT,

  -- 체크인
  checked_in_at DATETIME,
  checked_in_by VARCHAR(100) COMMENT '가이드명',

  -- 상태
  status ENUM('pending', 'confirmed', 'checked_in', 'completed', 'canceled', 'no_show') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',

  -- 특별 요청
  special_requests TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_schedule (schedule_id),
  INDEX idx_user (user_id),
  INDEX idx_booking_number (booking_number),
  INDEX idx_voucher (voucher_code),
  INDEX idx_status (status),

  FOREIGN KEY (schedule_id) REFERENCES tour_schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 3.2 API 엔드포인트

**생성할 파일들**:

1. **투어 조회**
   - `api/tour/packages.js` - 패키지 목록
   - `api/tour/packages/[id].js` - 패키지 상세
   - `api/tour/schedules/[packageId].js` - 출발 일정 조회

2. **예약**
   - `api/tour/book.js` - 투어 예약 생성
   - `api/tour/bookings/[id].js` - 예약 상세 조회
   - `api/tour/voucher/[bookingId].js` - 바우처 조회/QR 생성

3. **체크인**
   - `api/tour/check-in.js` - 투어 시작 체크인 (가이드용)
   - `api/tour/verify-voucher.js` - QR 바우처 검증

4. **관리**
   - `api/admin/tour/packages.js` - 패키지 관리
   - `api/admin/tour/schedules.js` - 일정 관리
   - `api/vendor/tour/bookings.js` - 업체 예약 관리

#### 3.3 프론트엔드 컴포넌트

**생성할 파일들**:

1. **`components/pages/TourPackageDetailPage.tsx`** (새로 생성)
   - 패키지 일정 표시
   - 포함/불포함 사항
   - 출발 날짜 선택
   - 인원 선택 (성인/아동/유아)

2. **`components/tour/TourItinerary.tsx`**
   - 일정표 UI (Day 1, Day 2...)

3. **`components/tour/TourBookingForm.tsx`**
   - 참가자 정보 입력 폼

4. **`components/tour/TourVoucher.tsx`**
   - 바우처 표시 + QR 코드

5. **`components/admin/TourManagement.tsx`**
   - 관리자용 투어 관리

---

## Phase 4: 음식 - 전체 시스템 구축

### 📌 목표
식당 메뉴 관리, 예약/포장/매장 주문, 테이블 QR 주문, 주문 상태 추적

### 🗂️ 필요한 작업

#### 4.1 데이터베이스 스키마

**파일**: `database/create-food-system.sql`

```sql
-- 1. 음식점 테이블
CREATE TABLE IF NOT EXISTS restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,

  listing_id INT NOT NULL,
  vendor_id INT NOT NULL,

  -- 기본 정보
  restaurant_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- 음식 분류
  cuisine_type VARCHAR(100) COMMENT '한식/중식/일식/양식/카페',
  food_categories JSON COMMENT '["한식-찌개", "한식-구이", "분식"]',

  -- 위치
  address VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- 연락처
  phone VARCHAR(50),

  -- 운영 정보
  operating_hours JSON COMMENT '{"mon": "11:00-21:00", "tue": "11:00-21:00", ...}',
  break_time JSON COMMENT '{"start": "15:00", "end": "17:00"}',
  last_order_time TIME COMMENT '마지막 주문 시간',

  -- 시설
  table_count INT DEFAULT 0,
  seat_count INT DEFAULT 0,
  parking_available BOOLEAN DEFAULT FALSE,

  -- 서비스 제공
  accepts_reservations BOOLEAN DEFAULT FALSE COMMENT '예약 가능',
  accepts_takeout BOOLEAN DEFAULT TRUE COMMENT '포장 가능',
  accepts_delivery BOOLEAN DEFAULT FALSE COMMENT '배달 가능',
  table_order_enabled BOOLEAN DEFAULT FALSE COMMENT '테이블 QR 주문',

  -- 이미지
  thumbnail_url VARCHAR(500),
  images JSON,
  menu_images JSON COMMENT '메뉴판 사진',

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listing (listing_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_code (restaurant_code),
  INDEX idx_cuisine (cuisine_type),
  INDEX idx_location (latitude, longitude),

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 2. 메뉴 테이블
CREATE TABLE IF NOT EXISTS menus (
  id INT AUTO_INCREMENT PRIMARY KEY,

  restaurant_id INT NOT NULL,

  -- 메뉴 정보
  menu_code VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) COMMENT '메인/사이드/음료/디저트',

  -- 가격
  price_krw INT NOT NULL,
  discount_price_krw INT COMMENT '할인가',

  -- 옵션
  options JSON COMMENT '[{"name": "맵기", "choices": ["순한맛", "보통", "매운맛"], "required": true}]',

  -- 재고
  is_available BOOLEAN DEFAULT TRUE,
  daily_limit INT COMMENT '하루 판매 한정',
  current_sold INT DEFAULT 0,

  -- 이미지
  image_url VARCHAR(500),

  -- 추천/인기
  is_signature BOOLEAN DEFAULT FALSE COMMENT '대표 메뉴',
  is_popular BOOLEAN DEFAULT FALSE COMMENT '인기 메뉴',

  -- 알레르기/식이정보
  allergens JSON COMMENT '["땅콩", "우유", "계란"]',
  spicy_level INT DEFAULT 0 COMMENT '0-5 (0=안매움)',
  calories INT,

  display_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_restaurant (restaurant_id),
  INDEX idx_category (category),
  INDEX idx_available (is_available),
  INDEX idx_display (display_order),

  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 3. 음식 주문 테이블
CREATE TABLE IF NOT EXISTS food_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,

  order_number VARCHAR(50) UNIQUE NOT NULL,
  restaurant_id INT NOT NULL,
  user_id INT,

  -- 주문 타입
  order_type ENUM('dine_in', 'takeout', 'delivery') NOT NULL,

  -- 매장 식사
  table_number INT COMMENT '테이블 번호',
  guest_count INT COMMENT '인원 수',

  -- 포장/배달
  pickup_time DATETIME COMMENT '포장 픽업 시간',
  delivery_address VARCHAR(500),

  -- 주문 내역
  items JSON NOT NULL COMMENT '[{"menu_id": 1, "name": "김치찌개", "quantity": 2, "price": 9000, "options": {...}}]',

  -- 가격
  subtotal_krw INT NOT NULL,
  delivery_fee_krw INT DEFAULT 0,
  discount_krw INT DEFAULT 0,
  total_krw INT NOT NULL,

  -- 특별 요청
  special_requests TEXT COMMENT '덜 맵게, 밥 많이',

  -- 상태
  status ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'canceled') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',

  -- 조리 시간
  estimated_ready_time DATETIME,
  ready_at DATETIME COMMENT '조리 완료 시간',

  -- 픽업/완료
  picked_up_at DATETIME,
  completed_at DATETIME,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_restaurant (restaurant_id),
  INDEX idx_user (user_id),
  INDEX idx_order_number (order_number),
  INDEX idx_status (status),
  INDEX idx_order_type (order_type),
  INDEX idx_table (table_number, status),

  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. 테이블 QR 테이블
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,

  restaurant_id INT NOT NULL,
  table_number INT NOT NULL,

  -- QR 코드
  qr_code TEXT,
  qr_url VARCHAR(500) COMMENT '/food/table-order/[restaurantId]/[tableNumber]',

  -- 테이블 정보
  seat_capacity INT DEFAULT 4,
  location VARCHAR(100) COMMENT '창가/홀/룸',

  -- 현재 상태
  status ENUM('available', 'occupied', 'reserved', 'cleaning') DEFAULT 'available',
  current_order_id INT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_table (restaurant_id, table_number),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_status (status),

  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (current_order_id) REFERENCES food_orders(id) ON DELETE SET NULL
);
```

#### 4.2 API 엔드포인트

**생성할 파일들**:

1. **식당 조회**
   - `api/food/restaurants.js` - 식당 목록
   - `api/food/restaurants/[id].js` - 식당 상세
   - `api/food/menus/[restaurantId].js` - 메뉴 조회

2. **주문**
   - `api/food/order.js` - 주문 생성 (예약/포장/배달)
   - `api/food/table-order/[restaurantId]/[tableNumber].js` - 테이블 QR 주문
   - `api/food/orders/[orderId].js` - 주문 상세 조회
   - `api/food/order-status/[orderId].js` - 실시간 주문 상태

3. **식당 예약**
   - `api/food/reservations.js` - 예약 생성
   - `api/food/reservations/[id]/cancel.js` - 예약 취소

4. **관리**
   - `api/vendor/food/orders.js` - 업체 주문 관리
   - `api/vendor/food/menus.js` - 메뉴 관리
   - `api/admin/food/restaurants.js` - 관리자 식당 관리

#### 4.3 프론트엔드 컴포넌트

**생성할 파일들**:

1. **`components/pages/RestaurantDetailPage.tsx`** (새로 생성)
   - 식당 정보 + 메뉴판
   - 예약/포장/배달 선택
   - 장바구니 기능

2. **`components/food/MenuList.tsx`**
   - 카테고리별 메뉴 표시
   - 옵션 선택 모달

3. **`components/food/TableOrderPage.tsx`**
   - 테이블 QR 스캔 후 주문 페이지
   - 테이블 번호 자동 입력

4. **`components/food/OrderStatusTracker.tsx`**
   - 실시간 주문 상태 (주문접수 → 조리중 → 완료)

5. **`components/vendor/FoodOrderManager.tsx`**
   - 업체용 주문 관리 대시보드
   - 신규 주문 알림

---

## Phase 5: 체험 - 전체 시스템 구축

### 📌 목표
체험 프로그램 슬롯 예약, 전자 면책동의서, 기상 API 연동 자동 취소

### 🗂️ 필요한 작업

#### 5.1 데이터베이스 스키마

**파일**: `database/create-experience-system.sql`

```sql
-- 1. 체험 프로그램 테이블
CREATE TABLE IF NOT EXISTS experiences (
  id INT AUTO_INCREMENT PRIMARY KEY,

  listing_id INT NOT NULL,
  vendor_id INT NOT NULL,

  -- 기본 정보
  experience_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- 체험 분류
  type VARCHAR(100) COMMENT '다이빙/서핑/패러글라이딩/승마/요트',
  category VARCHAR(100) COMMENT '해양스포츠/레저/문화체험',

  -- 난이도
  difficulty ENUM('easy', 'medium', 'hard', 'expert') DEFAULT 'easy',

  -- 참가 조건
  min_age INT DEFAULT 7,
  max_age INT COMMENT '상한 연령',
  min_height_cm INT,
  max_weight_kg INT,
  health_requirements TEXT COMMENT '심장질환자/임산부 불가',

  -- 정원
  min_participants INT DEFAULT 1,
  max_participants INT NOT NULL,

  -- 소요 시간
  duration_minutes INT NOT NULL,

  -- 안전
  safety_briefing_required BOOLEAN DEFAULT TRUE COMMENT '안전교육 필수',
  safety_video_url VARCHAR(500),
  waiver_required BOOLEAN DEFAULT TRUE COMMENT '면책동의 필수',
  waiver_template TEXT COMMENT '면책동의서 내용',

  -- 날씨 의존
  weather_dependent BOOLEAN DEFAULT FALSE,
  weather_conditions JSON COMMENT '{"min_temp": 10, "max_wind_speed": 15, "no_rain": true}',

  -- 장비
  equipment_included JSON COMMENT '["잠수복", "산소통", "핀"]',
  equipment_rental_available BOOLEAN DEFAULT FALSE,

  -- 가격
  price_krw INT NOT NULL,
  equipment_rental_price_krw INT,

  -- 이미지
  thumbnail_url VARCHAR(500),
  images JSON,
  videos JSON COMMENT '체험 영상',

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listing (listing_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_code (experience_code),
  INDEX idx_type (type),
  INDEX idx_active (is_active),

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 2. 체험 슬롯 테이블
CREATE TABLE IF NOT EXISTS experience_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,

  experience_id INT NOT NULL,

  -- 일정
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- 강사/가이드
  instructor_id INT,
  instructor_name VARCHAR(100),
  instructor_phone VARCHAR(50),

  -- 정원
  max_participants INT NOT NULL,
  current_participants INT DEFAULT 0,

  -- 기상 상태
  weather_status ENUM('good', 'caution', 'canceled') DEFAULT 'good',
  weather_checked_at DATETIME,
  weather_data JSON COMMENT '온도/풍속/강수량',

  -- 상태
  status ENUM('scheduled', 'confirmed', 'full', 'canceled', 'completed') DEFAULT 'scheduled',
  cancelation_reason TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_experience (experience_id),
  INDEX idx_date_time (date, start_time),
  INDEX idx_status (status),
  INDEX idx_weather (weather_status),

  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE
);

-- 3. 체험 예약 테이블
CREATE TABLE IF NOT EXISTS experience_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,

  booking_number VARCHAR(50) UNIQUE NOT NULL,
  slot_id INT NOT NULL,
  user_id INT NOT NULL,

  -- 참가자 정보
  participants JSON NOT NULL COMMENT '[{"name": "홍길동", "age": 30, "height": 175, "weight": 70}]',
  participant_count INT NOT NULL,

  -- 가격
  total_price_krw INT NOT NULL,

  -- 안전교육
  safety_video_watched BOOLEAN DEFAULT FALSE,
  safety_video_watched_at DATETIME,

  -- 면책동의
  waiver_signed BOOLEAN DEFAULT FALSE,
  waiver_signed_at DATETIME,
  waiver_signature_data TEXT COMMENT 'Base64 서명 이미지',
  waiver_ip_address VARCHAR(45),

  -- 장비 대여
  equipment_rental BOOLEAN DEFAULT FALSE,
  equipment_rental_items JSON,

  -- 바우처
  voucher_code VARCHAR(50) UNIQUE,
  qr_code TEXT,

  -- 체크인
  checked_in_at DATETIME,

  -- 상태
  status ENUM('pending', 'confirmed', 'checked_in', 'completed', 'canceled', 'weather_canceled') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_slot (slot_id),
  INDEX idx_user (user_id),
  INDEX idx_booking_number (booking_number),
  INDEX idx_voucher (voucher_code),
  INDEX idx_status (status),

  FOREIGN KEY (slot_id) REFERENCES experience_slots(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 5.2 API 엔드포인트

**생성할 파일들**:

1. **체험 조회**
   - `api/experience/list.js` - 체험 목록
   - `api/experience/[id].js` - 체험 상세
   - `api/experience/slots/[experienceId].js` - 예약 가능 슬롯

2. **예약**
   - `api/experience/book.js` - 예약 생성
   - `api/experience/bookings/[id].js` - 예약 상세
   - `api/experience/waiver.js` - 면책동의서 표시/서명

3. **안전교육**
   - `api/experience/safety-video/[bookingId].js` - 안전 영상 URL
   - `api/experience/safety-complete.js` - 시청 완료 기록

4. **날씨 체크**
   - `api/experience/weather-check.js` - 기상 API 확인
   - `api/experience/cancel-weather.js` - 기상 악화로 자동 취소

5. **관리**
   - `api/vendor/experience/bookings.js` - 업체 예약 관리
   - `api/admin/experience/experiences.js` - 관리자 체험 관리

#### 5.3 프론트엔드 컴포넌트

**생성할 파일들**:

1. **`components/pages/ExperienceDetailPage.tsx`** (새로 생성)
   - 체험 설명 + 안전 수칙
   - 슬롯 선택 캘린더
   - 참가자 정보 입력

2. **`components/experience/SafetyVideoPlayer.tsx`**
   - 안전교육 영상 (건너뛰기 불가)
   - 시청 완료 후 다음 단계

3. **`components/experience/WaiverForm.tsx`**
   - 면책동의서 표시
   - 전자 서명 패드

4. **`components/experience/WeatherAlert.tsx`**
   - 기상 악화 알림
   - 자동 취소/환불 안내

5. **`components/vendor/ExperienceBookingManager.tsx`**
   - 업체용 예약 관리
   - 기상 확인 버튼

---

## Phase 6: 행사 - 전체 시스템 구축

### 📌 목표
좌석 선택, 전자 티켓 발급, QR 입장 게이트 시스템

### 🗂️ 필요한 작업

#### 6.1 데이터베이스 스키마

**파일**: `database/create-event-system.sql`

```sql
-- 1. 행사 테이블
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,

  listing_id INT NOT NULL,
  vendor_id INT NOT NULL,

  -- 기본 정보
  event_code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- 행사 분류
  event_type VARCHAR(100) COMMENT '콘서트/연극/뮤지컬/축제/전시',
  genre VARCHAR(100) COMMENT '클래식/팝/락/코미디',

  -- 일시
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  doors_open_time TIME COMMENT '입장 시작 시간',

  -- 장소
  venue_name VARCHAR(200) NOT NULL,
  venue_address VARCHAR(500),
  venue_latitude DECIMAL(10, 8),
  venue_longitude DECIMAL(11, 8),

  -- 정원
  total_capacity INT NOT NULL,
  current_sold INT DEFAULT 0,

  -- 관람 등급
  age_restriction VARCHAR(50) COMMENT '전체관람가/12세/15세/19세',

  -- 좌석제 여부
  has_seats BOOLEAN DEFAULT FALSE,

  -- 출연진
  performers JSON COMMENT '["아티스트1", "아티스트2"]',

  -- 가격 (비좌석제)
  general_price_krw INT,
  vip_price_krw INT,

  -- 이미지
  poster_url VARCHAR(500),
  images JSON,

  -- 추가 정보
  running_time_minutes INT,
  intermission BOOLEAN DEFAULT FALSE,
  parking_info TEXT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listing (listing_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_code (event_code),
  INDEX idx_type (event_type),
  INDEX idx_datetime (start_datetime),

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 2. 좌석 배치도 테이블
CREATE TABLE IF NOT EXISTS event_seats (
  id INT AUTO_INCREMENT PRIMARY KEY,

  event_id INT NOT NULL,

  -- 좌석 정보
  section VARCHAR(50) NOT NULL COMMENT 'VIP석/R석/S석/A석',
  row VARCHAR(10) NOT NULL COMMENT '열 (A, B, C...)',
  seat_number VARCHAR(10) NOT NULL COMMENT '좌석 번호',

  -- 가격
  price_krw INT NOT NULL,

  -- 상태
  status ENUM('available', 'reserved', 'sold', 'blocked') DEFAULT 'available',
  booking_id INT COMMENT '예약 ID (임시 잠금)',
  ticket_id INT COMMENT '티켓 ID (판매 완료)',

  -- 임시 잠금 (10분)
  reserved_until DATETIME,

  -- 좌석 정보
  is_wheelchair BOOLEAN DEFAULT FALSE COMMENT '휠체어석',
  is_companion BOOLEAN DEFAULT FALSE COMMENT '동반석',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_seat (event_id, section, row, seat_number),
  INDEX idx_event (event_id),
  INDEX idx_section (section),
  INDEX idx_status (status),
  INDEX idx_reserved (reserved_until),

  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 3. 전자 티켓 테이블
CREATE TABLE IF NOT EXISTS event_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,

  event_id INT NOT NULL,
  user_id INT NOT NULL,

  -- 티켓 정보
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  order_number VARCHAR(50) NOT NULL,

  -- 좌석 정보 (좌석제인 경우)
  seat_id INT,
  seat_info JSON COMMENT '{"section": "VIP", "row": "A", "seat": "12"}',

  -- 티켓 타입 (비좌석제)
  ticket_type VARCHAR(50) COMMENT 'VIP/일반',

  -- 가격
  price_krw INT NOT NULL,

  -- QR 코드
  qr_code TEXT NOT NULL,
  qr_url VARCHAR(500),

  -- 입장
  entry_scanned BOOLEAN DEFAULT FALSE,
  entry_scanned_at DATETIME,
  entry_gate VARCHAR(50),
  entry_scanned_by VARCHAR(100) COMMENT '게이트 직원',

  -- 양도
  transferred_to_user_id INT,
  transferred_at DATETIME,

  -- 상태
  status ENUM('active', 'used', 'canceled', 'refunded') DEFAULT 'active',
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_event (event_id),
  INDEX idx_user (user_id),
  INDEX idx_ticket_number (ticket_number),
  INDEX idx_order (order_number),
  INDEX idx_seat (seat_id),
  INDEX idx_status (status),

  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (seat_id) REFERENCES event_seats(id) ON DELETE SET NULL
);
```

#### 6.2 API 엔드포인트

**생성할 파일들**:

1. **행사 조회**
   - `api/event/list.js` - 행사 목록
   - `api/event/[id].js` - 행사 상세
   - `api/event/seats/[eventId].js` - 좌석 배치도 조회

2. **예약**
   - `api/event/book-seats.js` - 좌석 선택 예약
   - `api/event/lock-seats.js` - 좌석 임시 잠금 (10분)
   - `api/event/tickets/[orderId].js` - 티켓 조회

3. **입장**
   - `api/event/gate-scan.js` - QR 입장 스캔 (게이트용)
   - `api/event/verify-ticket.js` - 티켓 유효성 검증

4. **관리**
   - `api/vendor/event/tickets.js` - 업체 티켓 관리
   - `api/vendor/event/gate-stats.js` - 입장 통계
   - `api/admin/event/events.js` - 관리자 행사 관리

#### 6.3 프론트엔드 컴포넌트

**생성할 파일들**:

1. **`components/pages/EventDetailPage.tsx`** (새로 생성)
   - 행사 정보 + 출연진
   - 좌석 선택 또는 일반 티켓 선택

2. **`components/event/SeatMap.tsx`**
   - 좌석 배치도 UI
   - 선택한 좌석 실시간 반영

3. **`components/event/TicketDisplay.tsx`**
   - 전자 티켓 표시
   - QR 코드 크게 보기

4. **`components/event/GateScannerPage.tsx`**
   - 게이트 직원용 QR 스캔 페이지
   - 스캔 결과 표시 (✅ 유효 / ❌ 이미 사용)

5. **`components/vendor/EventGateManager.tsx`**
   - 업체용 입장 관리
   - 실시간 입장 현황

---

## Phase 7: 관광지 - 입장권 시스템 구축

### 📌 목표
입장권 구매, 게이트 QR 검증 (오디오 가이드 제외)

### 🗂️ 필요한 작업

#### 7.1 데이터베이스 스키마

**파일**: `database/create-attraction-system.sql`

```sql
-- 1. 관광지 테이블
CREATE TABLE IF NOT EXISTS attractions (
  id INT AUTO_INCREMENT PRIMARY KEY,

  listing_id INT NOT NULL,
  vendor_id INT NOT NULL,

  -- 기본 정보
  attraction_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- 관광지 분류
  type VARCHAR(100) COMMENT '박물관/유적지/테마파크/전시관/동물원',
  category VARCHAR(100) COMMENT '문화/역사/자연/레저',

  -- 위치
  address VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- 연락처
  phone VARCHAR(50),
  website VARCHAR(500),

  -- 운영 정보
  operating_hours JSON COMMENT '{"mon": "09:00-18:00", ...}',
  last_entry_time TIME COMMENT '마지막 입장 시간',

  -- 입장료
  admission_fee_adult INT NOT NULL,
  admission_fee_child INT,
  admission_fee_senior INT,
  admission_fee_infant INT DEFAULT 0,

  -- 무료 입장일
  free_entry_days JSON COMMENT '["매월 마지막 수요일", "어린이날"]',

  -- 주차
  parking_available BOOLEAN DEFAULT FALSE,
  parking_fee INT DEFAULT 0,
  parking_info TEXT,

  -- 시설
  wheelchair_accessible BOOLEAN DEFAULT FALSE,
  stroller_friendly BOOLEAN DEFAULT FALSE,
  pet_allowed BOOLEAN DEFAULT FALSE,

  -- 이미지
  thumbnail_url VARCHAR(500),
  images JSON,

  -- 추가 정보
  estimated_visit_duration_minutes INT COMMENT '평균 관람 시간',
  highlights JSON COMMENT '["대표 전시물1", "포토존"]',

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listing (listing_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_code (attraction_code),
  INDEX idx_type (type),
  INDEX idx_location (latitude, longitude),

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 2. 입장권 테이블
CREATE TABLE IF NOT EXISTS entry_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,

  attraction_id INT NOT NULL,
  user_id INT NOT NULL,

  -- 티켓 정보
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  order_number VARCHAR(50) NOT NULL,

  -- 티켓 타입
  ticket_type ENUM('adult', 'child', 'senior', 'infant', 'group') NOT NULL,
  ticket_count INT DEFAULT 1 COMMENT '단체권의 경우 인원수',

  -- 가격
  price_krw INT NOT NULL,

  -- 유효 기간
  valid_date DATE NOT NULL,
  valid_until DATE COMMENT '기간권의 경우 종료일',

  -- QR 코드
  qr_code TEXT NOT NULL,
  qr_url VARCHAR(500),

  -- 입장
  entry_scanned BOOLEAN DEFAULT FALSE,
  entry_scanned_at DATETIME,
  entry_gate VARCHAR(50),
  entry_count INT DEFAULT 0 COMMENT '재입장 횟수',

  -- 상태
  status ENUM('active', 'used', 'expired', 'canceled', 'refunded') DEFAULT 'active',
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_attraction (attraction_id),
  INDEX idx_user (user_id),
  INDEX idx_ticket_number (ticket_number),
  INDEX idx_order (order_number),
  INDEX idx_valid_date (valid_date),
  INDEX idx_status (status),

  FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. 단체 예약 테이블
CREATE TABLE IF NOT EXISTS group_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,

  attraction_id INT NOT NULL,
  user_id INT NOT NULL,

  -- 단체 정보
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  group_name VARCHAR(200) COMMENT '단체명 (학교/회사)',
  participant_count INT NOT NULL,

  -- 방문 날짜
  visit_date DATE NOT NULL,
  visit_time TIME,

  -- 가격 (할인 적용)
  original_price_krw INT,
  discount_rate DECIMAL(5, 2) COMMENT '할인율 (%)',
  final_price_krw INT NOT NULL,

  -- 연락처
  contact_name VARCHAR(100),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(200),

  -- 특별 요청
  special_requests TEXT COMMENT '가이드 요청/점심 장소 문의',

  -- 상태
  status ENUM('pending', 'confirmed', 'completed', 'canceled') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_attraction (attraction_id),
  INDEX idx_user (user_id),
  INDEX idx_booking_number (booking_number),
  INDEX idx_visit_date (visit_date),
  INDEX idx_status (status),

  FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 7.2 API 엔드포인트

**생성할 파일들**:

1. **관광지 조회**
   - `api/tourist/list.js` - 관광지 목록
   - `api/tourist/[id].js` - 관광지 상세
   - `api/tourist/nearby.js` - 주변 관광지

2. **입장권 구매**
   - `api/tourist/tickets.js` - 입장권 구매
   - `api/tourist/tickets/[orderId].js` - 입장권 조회
   - `api/tourist/group-booking.js` - 단체 예약

3. **게이트 검증**
   - `api/tourist/gate-verify.js` - QR 입장 검증
   - `api/tourist/tickets/[ticketNumber]/scan.js` - 스캔 기록

4. **관리**
   - `api/vendor/tourist/tickets.js` - 업체 입장권 관리
   - `api/vendor/tourist/gate-stats.js` - 입장 통계
   - `api/admin/tourist/attractions.js` - 관리자 관광지 관리

#### 7.3 프론트엔드 컴포넌트

**생성할 파일들**:

1. **`components/pages/AttractionDetailPage.tsx`** (새로 생성)
   - 관광지 소개 + 하이라이트
   - 입장권 선택 (성인/어린이/경로)
   - 방문 날짜 선택

2. **`components/tourist/TicketPurchaseForm.tsx`**
   - 티켓 타입 및 수량 선택
   - 단체 예약 옵션

3. **`components/tourist/EntryTicket.tsx`**
   - 입장권 QR 표시
   - 유효 기간 표시

4. **`components/tourist/GateVerifier.tsx`**
   - 게이트 직원용 QR 스캔
   - 입장 가능 여부 표시

5. **`components/vendor/TouristGateManager.tsx`**
   - 업체용 입장 관리
   - 일별 입장 통계

---

## 개발 체크리스트

### ✅ Phase 1: 렌트카 사고 신고
- [ ] DB 스키마 생성 (`accident_reports` 테이블)
- [ ] API 4개 생성 (report, detail, list, admin)
- [ ] 프론트엔드 4개 컴포넌트
- [ ] 알림 시스템 연동
- [ ] 테스트 및 배포

### ✅ Phase 2: 숙박 캘린더 재고
- [ ] DB 스키마 생성 (`room_availability`, `pricing_rules`)
- [ ] 재고 초기화 API
- [ ] API 4개 생성
- [ ] 캘린더 UI 컴포넌트
- [ ] 재고 잠금 시스템
- [ ] 테스트 및 배포

### ✅ Phase 3: 여행 전체
- [ ] DB 스키마 3개 테이블
- [ ] API 12개 이상 생성
- [ ] 상세 페이지 새로 생성
- [ ] 바우처 시스템
- [ ] 테스트 및 배포

### ✅ Phase 4: 음식 전체
- [ ] DB 스키마 4개 테이블
- [ ] API 12개 이상 생성
- [ ] 상세 페이지 새로 생성
- [ ] 테이블 QR 시스템
- [ ] 주문 상태 추적
- [ ] 테스트 및 배포

### ✅ Phase 5: 체험 전체
- [ ] DB 스키마 3개 테이블
- [ ] API 12개 이상 생성
- [ ] 상세 페이지 새로 생성
- [ ] 면책동의 시스템
- [ ] 기상 API 연동
- [ ] 테스트 및 배포

### ✅ Phase 6: 행사 전체
- [ ] DB 스키마 3개 테이블
- [ ] API 12개 이상 생성
- [ ] 상세 페이지 새로 생성
- [ ] 좌석 선택 UI
- [ ] 게이트 스캔 시스템
- [ ] 테스트 및 배포

### ✅ Phase 7: 관광지
- [ ] DB 스키마 3개 테이블
- [ ] API 10개 생성
- [ ] 상세 페이지 새로 생성
- [ ] 게이트 검증 시스템
- [ ] 단체 예약 기능
- [ ] 테스트 및 배포

---

## 📝 개발 진행 시 주의사항

### 1. **기존 시스템과의 통합**
- `listings` 테이블 연동 필수
- `partners`/`vendors` 테이블 재사용
- 기존 결제/환불 시스템 활용

### 2. **상세 페이지 커스터마이징**
- 각 카테고리별 별도 DetailPage 필요
- 공통 컴포넌트 최대한 재사용
- `CategoryDetailPage.tsx` 참고

### 3. **QR/바우처 시스템 통합**
- 모든 카테고리가 유사한 바우처 시스템 사용
- `voucher_code`, `qr_code` 컬럼 일관성 유지

### 4. **결제 연동**
- 기존 토스페이먼츠 시스템 활용
- 카테고리별 `feature_flags` 확인

### 5. **점진적 배포**
- Phase별로 완료 후 즉시 배포
- 사용자 피드백 수집 후 다음 Phase

---

## 🔄 나중에 참고할 파일 위치

**이 문서**: `DEVELOPMENT_ROADMAP.md` (프로젝트 루트)

**관련 기존 파일**:
- `database/` - 모든 SQL 스키마
- `api/rentcar/` - 렌트카 API 참고용
- `components/pages/RentcarVehicleDetailPage.tsx` - 상세 페이지 예시
- `api/lodging/` - 숙박 API 참고용

---

**작성자**: Claude
**최종 업데이트**: 2025-10-31
**상태**: 계획 수립 완료, 구현 대기 중
