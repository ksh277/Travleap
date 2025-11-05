# 🚀 Travleap DB 마이그레이션 완전 가이드

**작성일:** 2025-11-05
**목적:** PlanetScale + Neon → 네이버/구글 Cloud DB (단일 MySQL/PostgreSQL)
**예상 소요 시간:** 4-6시간 (새벽 시간 작업 권장)

---

## 📊 현재 DB 구조 (Dual DB)

### 1. PlanetScale MySQL (메인 DB)
- **연결:** `process.env.DATABASE_URL`
- **사용 파일:** 337개 (308개 단독 + 29개 이중 사용)
- **테이블:** 95+ 개 (기본 15개 + Admin 5개 + 렌트카 30개 + 투어 3개 + 음식 4개 + 체험 3개 + 이벤트 3개 + 관광지 2개 + 숙박 15개 + 기타 15개)

### 2. Neon PostgreSQL (보조 DB)
- **연결:** `process.env.POSTGRES_DATABASE_URL`
- **사용 파일:** 56개 (27개 단독 + 29개 이중 사용)
- **테이블:** 1개 (`users`)

---

## 📋 전체 테이블 목록 및 구조

### ✅ PlanetScale MySQL 테이블 (95+ 개)

#### 1. **users** (⚠️ 중복: Neon에도 존재)
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(100) UNIQUE,          -- 레거시 필드
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role ENUM('admin', 'user', 'vendor', 'partner') DEFAULT 'user',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  provider VARCHAR(50),                  -- 'local', 'kakao', 'google'
  provider_id VARCHAR(255),
  avatar VARCHAR(500),
  preferred_language VARCHAR(10) DEFAULT 'ko',
  preferred_currency VARCHAR(10) DEFAULT 'KRW',
  profile_image VARCHAR(500),
  marketing_consent BOOLEAN DEFAULT false,
  total_points INT DEFAULT 0,           -- ⚠️ Neon에도 있음
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**⚠️ 마이그레이션 주의사항:**
- PlanetScale의 users는 **레거시** (사용 안 함)
- Neon PostgreSQL의 users가 **실제 사용 중**
- Neon → 새 DB로 이전 필수

---

#### 2. **listings** (상품)
```sql
CREATE TABLE listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_id INT,                       -- ✅ FK → partners(id)
  category_id INT,                      -- ✅ FK → categories(id)
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,        -- 'stay', 'rental', 'tour', etc.
  location VARCHAR(100),
  address TEXT,
  coordinates VARCHAR(100),
  price_from DECIMAL(10, 2),
  price_to DECIMAL(10, 2),
  short_description TEXT,
  description_md TEXT,
  images JSON,
  amenities JSON,
  highlights JSON,
  rating_avg DECIMAL(3, 2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  booking_count INT DEFAULT 0,
  featured_score INT DEFAULT 0,
  partner_boost INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  max_capacity INT,
  min_capacity INT DEFAULT 1,
  duration VARCHAR(50),
  tags JSON,

  -- 숙박 전용 필드
  room_code VARCHAR(50),
  room_number VARCHAR(50),
  room_type VARCHAR(50),
  floor INT,
  bed_type VARCHAR(50),
  bed_count INT,
  size_sqm DECIMAL(10, 2),
  base_price_per_night DECIMAL(10, 2),
  weekend_surcharge DECIMAL(10, 2),
  view_type VARCHAR(50),
  has_balcony BOOLEAN,
  breakfast_included BOOLEAN,
  wifi_available BOOLEAN,
  tv_available BOOLEAN,
  minibar_available BOOLEAN,
  air_conditioning BOOLEAN,
  heating BOOLEAN,
  bathroom_type VARCHAR(50),
  max_occupancy INT,
  min_nights INT DEFAULT 1,
  max_nights INT,

  -- 재고 관리
  stock INT,
  stock_enabled BOOLEAN DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_category (category),
  INDEX idx_category_id (category_id),
  INDEX idx_partner_id (partner_id),
  INDEX idx_is_active (is_active),
  INDEX idx_rating (rating_avg)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE listings
ADD CONSTRAINT fk_listing_partner
FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;

ALTER TABLE listings
ADD CONSTRAINT fk_listing_category
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
```

---

#### 3. **bookings** (예약)
```sql
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                 -- ✅ FK → users(id)
  listing_id INT NOT NULL,              -- ✅ FK → listings(id)
  booking_number VARCHAR(100) UNIQUE,   -- 'BK-1730123456-789'
  order_number VARCHAR(150),            -- 'ORDER_{UUID}' (장바구니 주문 시)
  booking_date DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  guests INT DEFAULT 1,
  adults INT DEFAULT 0,
  children INT DEFAULT 0,
  infants INT DEFAULT 0,
  total_amount DECIMAL(10, 2),
  status ENUM('pending', 'hold', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'refunded', 'failed') DEFAULT 'pending',
  selected_option_id INT,               -- ✅ FK → product_options(id)
  special_requests TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  points_earned INT DEFAULT 0,

  -- 배송 정보 (팝업 카테고리)
  delivery_status ENUM('pending', 'READY', 'shipped', 'delivered') DEFAULT NULL,
  shipping_fee DECIMAL(10, 2),
  shipping_name VARCHAR(100),
  shipping_phone VARCHAR(50),
  shipping_address TEXT,
  shipping_address_detail VARCHAR(255),
  shipping_zipcode VARCHAR(20),
  tracking_number VARCHAR(100),
  courier_company VARCHAR(50),

  -- 게스트 정보
  guest_name VARCHAR(100),
  guest_phone VARCHAR(50),
  guest_email VARCHAR(255),

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_listing_id (listing_id),
  INDEX idx_booking_number (booking_number),
  INDEX idx_order_number (order_number),
  INDEX idx_status (status),
  INDEX idx_booking_date (booking_date)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE bookings
ADD CONSTRAINT fk_booking_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE bookings
ADD CONSTRAINT fk_booking_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE bookings
ADD CONSTRAINT fk_booking_option
FOREIGN KEY (selected_option_id) REFERENCES product_options(id) ON DELETE SET NULL;
```

---

#### 4. **payments** (결제)
```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                 -- ✅ FK → users(id)
  booking_id INT,                       -- ✅ FK → bookings(id) (단일 상품 결제)
  order_id INT,                         -- 레거시 필드
  order_id_str VARCHAR(150),            -- 'BK-xxx' or 'ORDER_xxx'
  payment_key VARCHAR(200),             -- Toss Payments 키
  gateway_transaction_id VARCHAR(200),  -- 주문번호 (ORDER_xxx)
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KRW',
  payment_method ENUM('card', 'bank_transfer', 'kakaopay', 'naverpay', 'samsung_pay'),
  payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'completed') DEFAULT 'pending',
  approved_at DATETIME,
  receipt_url VARCHAR(500),

  -- 카드 정보
  card_company VARCHAR(50),
  card_number VARCHAR(50),              -- 마스킹됨 (4567****1234)
  card_installment INT DEFAULT 0,

  -- 가상계좌 정보
  virtual_account_number VARCHAR(100),
  virtual_account_bank VARCHAR(50),
  virtual_account_due_date DATETIME,

  -- 환불 정보
  refund_amount DECIMAL(10, 2),
  refund_reason TEXT,
  refunded_at DATETIME,

  -- 기타
  notes JSON,                           -- 장바구니 주문 시 상세 정보
  hidden_from_user BOOLEAN DEFAULT 0,   -- 사용자 화면 숨김

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_booking_id (booking_id),
  INDEX idx_payment_key (payment_key),
  INDEX idx_gateway_transaction_id (gateway_transaction_id),
  INDEX idx_payment_status (payment_status)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE payments
ADD CONSTRAINT fk_payment_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE payments
ADD CONSTRAINT fk_payment_booking
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
```

---

#### 5. **user_points** (포인트 내역)
```sql
CREATE TABLE user_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                 -- ✅ FK → users(id)
  points INT NOT NULL,                  -- 양수(적립), 음수(사용/만료)
  point_type ENUM('earn', 'use', 'refund', 'expire', 'admin') NOT NULL,
  reason VARCHAR(500) NOT NULL,
  related_order_id VARCHAR(100),        -- payment_id (문자열)
  related_payment_id INT,               -- 레거시
  balance_after INT NOT NULL,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_point_type (point_type),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE user_points
ADD CONSTRAINT fk_points_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

#### 6. **cart_items** (장바구니)
```sql
CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                 -- ✅ FK → users(id)
  listing_id INT NOT NULL,              -- ✅ FK → listings(id)
  quantity INT DEFAULT 1,
  selected_date DATE,
  selected_options JSON,
  num_adults INT DEFAULT 1,
  num_children INT DEFAULT 0,
  num_seniors INT DEFAULT 0,
  price_snapshot DECIMAL(10, 2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_listing_id (listing_id)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE cart_items
ADD CONSTRAINT fk_cart_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cart_items
ADD CONSTRAINT fk_cart_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
```

---

#### 7. **partners** (파트너/벤더)
```sql
CREATE TABLE partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,                          -- ✅ FK → users(id)
  business_name VARCHAR(200),
  company_name VARCHAR(200),
  business_number VARCHAR(50),
  representative_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  partner_type VARCHAR(50),             -- 'lodging', 'rentcar', 'tour', etc.
  category VARCHAR(50),
  description TEXT,
  logo VARCHAR(500),
  website VARCHAR(500),
  status ENUM('active', 'inactive', 'pending', 'rejected') DEFAULT 'pending',
  commission_rate DECIMAL(5, 2) DEFAULT 10.00,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  check_in_time TIME,
  check_out_time TIME,
  policies JSON,
  coordinates VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_partner_type (partner_type)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE partners
ADD CONSTRAINT fk_partner_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

---

#### 8. **categories** (카테고리)
```sql
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name_ko VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  name_jp VARCHAR(100),
  name_cn VARCHAR(100),
  icon VARCHAR(50),
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active)
);
```

**기본 데이터:**
```sql
INSERT INTO categories (id, slug, name_ko, name_en, icon, sort_order) VALUES
(1857, 'stay', '숙박', 'Accommodation', '🏨', 1),
(1858, 'rental', '렌트카', 'Car Rental', '🚗', 2),
(1859, 'tour', '투어', 'Tour', '🎯', 3),
(1860, 'food', '음식', 'Food', '🍽️', 4),
(1861, 'attraction', '관광지', 'Attraction', '🏛️', 5),
(1862, 'experience', '체험', 'Experience', '🎨', 6),
(1863, 'event', '행사', 'Event', '🎉', 7),
(1870, '팝업', '팝업', 'Popup', '🎪', 8);
```

---

#### 9. **product_options** (상품 옵션)
```sql
CREATE TABLE product_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,              -- ✅ FK → listings(id)
  option_name VARCHAR(200) NOT NULL,
  option_type VARCHAR(50),
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  stock INT,                            -- NULL = 무제한
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listing_id (listing_id),
  INDEX idx_is_active (is_active)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE product_options
ADD CONSTRAINT fk_option_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
```

---

#### 10. **reviews** (리뷰)
```sql
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,              -- ✅ FK → listings(id)
  user_id INT NOT NULL,                 -- ✅ FK → users(id)
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  content TEXT NOT NULL,
  images JSON,
  helpful_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  admin_reply TEXT,
  admin_reply_at DATETIME,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listing_id (listing_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE reviews
ADD CONSTRAINT fk_review_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE reviews
ADD CONSTRAINT fk_review_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

#### 11. **coupons** (쿠폰)
```sql
CREATE TABLE coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  min_amount DECIMAL(10, 2),
  max_discount DECIMAL(10, 2),
  usage_limit INT,
  used_count INT DEFAULT 0,
  valid_from DATETIME,
  valid_until DATETIME,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_code (code),
  INDEX idx_is_active (is_active)
);
```

---

#### 12. **user_coupons** (사용자 쿠폰)
```sql
CREATE TABLE user_coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                 -- ✅ FK → users(id)
  coupon_id INT NOT NULL,               -- ✅ FK → coupons(id)
  is_used BOOLEAN DEFAULT false,
  used_at DATETIME,
  order_number VARCHAR(150),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_coupon_id (coupon_id),
  INDEX idx_is_used (is_used)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE user_coupons
ADD CONSTRAINT fk_user_coupon_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_coupons
ADD CONSTRAINT fk_user_coupon_coupon
FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE;
```

---

#### 13. **refund_policies** (환불 정책)
```sql
CREATE TABLE refund_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT,                       -- ✅ FK → listings(id) (NULL = 전체)
  category VARCHAR(50),
  policy_name VARCHAR(200) NOT NULL,
  is_refundable BOOLEAN DEFAULT true,
  refund_policy_json JSON,
  refund_disabled_reason TEXT,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_listing_id (listing_id),
  INDEX idx_category (category),
  INDEX idx_is_active (is_active)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE refund_policies
ADD CONSTRAINT fk_refund_policy_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
```

---

#### 14. **booking_logs** (예약 로그)
```sql
CREATE TABLE booking_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT NOT NULL,               -- ✅ FK → bookings(id)
  action VARCHAR(50) NOT NULL,              -- 'CREATED', 'CONFIRMED', 'CANCELLED', etc.
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_booking_id (booking_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE booking_logs
ADD CONSTRAINT fk_booking_log_booking
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
```

---

#### 15. **user_coupons** (사용자 쿠폰)
```sql
CREATE TABLE user_coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                     -- ✅ FK → users(id)
  coupon_id INT NOT NULL,                   -- ✅ FK → coupons(id)
  is_used BOOLEAN DEFAULT false,
  used_at DATETIME,
  order_number VARCHAR(150),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_coupon_id (coupon_id)
);
```

**⚠️ 외래키 추가 필요:**
```sql
ALTER TABLE user_coupons
ADD CONSTRAINT fk_user_coupon_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_coupons
ADD CONSTRAINT fk_user_coupon_coupon
FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE;
```

---

### **렌트카 시스템 테이블 (30개)**

#### 16. **rentcar_vendors** (렌트카 업체)
```sql
CREATE TABLE rentcar_vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,                              -- ✅ FK → users(id)
  company_name VARCHAR(200),
  business_number VARCHAR(50),
  phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true
);
```

#### 17. **rentcar_vehicles** (렌트카 차량)
```sql
CREATE TABLE rentcar_vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,                   -- ✅ FK → rentcar_vendors(id)
  listing_id INT,                           -- ✅ FK → listings(id)
  vehicle_name VARCHAR(200),
  vehicle_class VARCHAR(50),
  transmission VARCHAR(20),
  fuel_type VARCHAR(20),
  seats INT,
  daily_rate_krw INT,
  is_available BOOLEAN DEFAULT true
);
```

#### 18. **rentcar_bookings** (렌트카 예약)
```sql
CREATE TABLE rentcar_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                     -- ✅ FK → users(id)
  vendor_id INT NOT NULL,                   -- ✅ FK → rentcar_vendors(id)
  vehicle_id INT NOT NULL,                  -- ✅ FK → rentcar_vehicles(id)
  booking_number VARCHAR(100) UNIQUE,
  pickup_date DATETIME,
  return_date DATETIME,
  total_krw INT,
  status VARCHAR(50),
  payment_status VARCHAR(50)
);
```

#### 19. **rentcar_insurance** (렌트카 보험)
```sql
CREATE TABLE rentcar_insurance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,                   -- ✅ FK → rentcar_vendors(id)
  name VARCHAR(100),
  hourly_rate_krw INT,
  is_active BOOLEAN DEFAULT true
);
```

#### 20-45. **기타 렌트카 테이블 (26개)**
```sql
-- rentcar_insurance_plans, rentcar_insurance_products
-- rentcar_booking_insurance (booking_id FK → rentcar_bookings)
-- rentcar_extras, rentcar_booking_extras
-- rentcar_additional_options, rentcar_booking_options
-- rentcar_locations (vendor_id FK)
-- rentcar_pricing_policies, rentcar_rate_plans
-- rentcar_rental_deposits, rentcar_rental_payments
-- rentcar_rental_events (rental_id FK)
-- rentcar_state_transitions (booking_id FK)
-- rentcar_availability_rules (vehicle_id FK)
-- rentcar_vehicle_blocks (vehicle_id FK)
-- rentcar_price_cache
-- rentcar_notifications
-- rentcar_pms_config, rentcar_pms_sync_log, rentcar_sync_jobs
-- rentcar_api_credentials (vendor_id FK)
-- rentcar_vendor_users (vendor_id FK, user_id FK)
-- rentcar_audit_logs
-- rentcar_webhook_events
-- rentcar_mapping_dicts
```

---

### **투어 시스템 테이블 (3개)**

#### 46. **tour_packages** (투어 패키지)
```sql
CREATE TABLE tour_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,                  -- ✅ FK → listings(id)
  vendor_id INT NOT NULL,                   -- ✅ FK → users(id) or partners(id)
  package_code VARCHAR(50) UNIQUE,
  package_name VARCHAR(200),
  duration_days INT,
  duration_nights INT,
  price_adult_krw INT,
  itinerary JSON,
  is_active BOOLEAN DEFAULT true
);
```

#### 47. **tour_schedules** (투어 일정)
```sql
CREATE TABLE tour_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,                  -- ✅ FK → tour_packages(id)
  departure_date DATE,
  departure_time TIME,
  max_participants INT,
  current_participants INT DEFAULT 0,
  status VARCHAR(50)
);
```

#### 48. **tour_bookings** (투어 예약)
```sql
CREATE TABLE tour_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                     -- ✅ FK → users(id)
  schedule_id INT NOT NULL,                 -- ✅ FK → tour_schedules(id)
  num_adults INT,
  num_children INT,
  total_amount DECIMAL(10, 2),
  booking_status VARCHAR(50)
);
```

---

### **음식 시스템 테이블 (4개)**

#### 49. **restaurants** (음식점)
```sql
CREATE TABLE restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,                  -- ✅ FK → listings(id)
  vendor_id INT NOT NULL,                   -- ✅ FK → users(id) or partners(id)
  restaurant_code VARCHAR(50) UNIQUE,
  name VARCHAR(200),
  cuisine_type VARCHAR(100),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true
);
```

#### 50. **menus** (메뉴)
```sql
CREATE TABLE menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,               -- ✅ FK → restaurants(id)
  name VARCHAR(200),
  price_krw INT,
  category VARCHAR(100),
  is_available BOOLEAN DEFAULT true
);
```

#### 51. **restaurant_tables** (식당 테이블)
```sql
CREATE TABLE restaurant_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,               -- ✅ FK → restaurants(id)
  table_number VARCHAR(20),
  seat_count INT,
  status VARCHAR(50)
);
```

#### 52. **food_orders** (음식 주문)
```sql
CREATE TABLE food_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,                              -- ✅ FK → users(id)
  restaurant_id INT NOT NULL,               -- ✅ FK → restaurants(id)
  table_id INT,                             -- ✅ FK → restaurant_tables(id)
  order_number VARCHAR(100),
  total_amount DECIMAL(10, 2),
  order_type VARCHAR(50),                   -- 'dine-in', 'takeout', 'delivery'
  status VARCHAR(50)
);
```

---

### **체험 시스템 테이블 (3개)**

#### 53. **experiences** (체험 상품)
```sql
CREATE TABLE experiences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,                  -- ✅ FK → listings(id)
  vendor_id INT NOT NULL,                   -- ✅ FK → users(id) or partners(id)
  experience_code VARCHAR(50) UNIQUE,
  name VARCHAR(200),
  duration_minutes INT,
  price_krw INT,
  max_participants INT,
  is_active BOOLEAN DEFAULT true
);
```

#### 54. **experience_slots** (체험 슬롯)
```sql
CREATE TABLE experience_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  experience_id INT NOT NULL,               -- ✅ FK → experiences(id)
  slot_date DATE,
  slot_time TIME,
  max_participants INT,
  current_participants INT DEFAULT 0,
  status VARCHAR(50)
);
```

#### 55. **experience_bookings** (체험 예약)
```sql
CREATE TABLE experience_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                     -- ✅ FK → users(id)
  slot_id INT NOT NULL,                     -- ✅ FK → experience_slots(id)
  num_participants INT,
  total_amount DECIMAL(10, 2),
  booking_status VARCHAR(50)
);
```

---

### **이벤트 시스템 테이블 (3개)**

#### 56. **events** (이벤트/행사)
```sql
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,                  -- ✅ FK → listings(id)
  vendor_id INT NOT NULL,                   -- ✅ FK → users(id) or partners(id)
  event_code VARCHAR(50) UNIQUE,
  name VARCHAR(200),
  event_date DATETIME,
  venue VARCHAR(200),
  total_seats INT,
  is_active BOOLEAN DEFAULT true
);
```

#### 57. **event_seats** (이벤트 좌석)
```sql
CREATE TABLE event_seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,                    -- ✅ FK → events(id)
  section VARCHAR(50),
  row VARCHAR(10),
  seat_number VARCHAR(10),
  price_krw INT,
  is_available BOOLEAN DEFAULT true
);
```

#### 58. **event_tickets** (이벤트 티켓)
```sql
CREATE TABLE event_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                     -- ✅ FK → users(id)
  event_id INT NOT NULL,                    -- ✅ FK → events(id)
  seat_id INT,                              -- ✅ FK → event_seats(id)
  ticket_number VARCHAR(100) UNIQUE,
  purchase_date DATETIME,
  status VARCHAR(50)
);
```

---

### **관광지 시스템 테이블 (2개)**

#### 59. **attractions** (관광지)
```sql
CREATE TABLE attractions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,                  -- ✅ FK → listings(id)
  vendor_id INT,                            -- ✅ FK → users(id) or partners(id)
  attraction_code VARCHAR(50) UNIQUE,
  name VARCHAR(200),
  entry_fee_krw INT,
  operating_hours JSON,
  is_active BOOLEAN DEFAULT true
);
```

#### 60. **entry_tickets** (입장권)
```sql
CREATE TABLE entry_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                     -- ✅ FK → users(id)
  attraction_id INT NOT NULL,               -- ✅ FK → attractions(id)
  ticket_number VARCHAR(100) UNIQUE,
  visit_date DATE,
  num_adults INT,
  num_children INT,
  total_amount DECIMAL(10, 2),
  status VARCHAR(50)
);
```

---

### **숙박(PMS) 시스템 테이블 (15개)**

#### 61. **lodgings** (숙박 시설)
```sql
CREATE TABLE lodgings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT,                           -- ✅ FK → listings(id)
  vendor_id INT NOT NULL,                   -- ✅ FK → users(id) or partners(id)
  lodging_code VARCHAR(50) UNIQUE,
  name VARCHAR(200),
  address TEXT,
  check_in_time TIME,
  check_out_time TIME,
  is_active BOOLEAN DEFAULT true
);
```

#### 62. **rooms** (객실)
```sql
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lodging_id INT NOT NULL,                  -- ✅ FK → lodgings(id)
  room_type VARCHAR(100),
  room_number VARCHAR(50),
  max_occupancy INT,
  base_price_krw INT,
  is_available BOOLEAN DEFAULT true
);
```

#### 63. **lodging_bookings** (숙박 예약)
```sql
CREATE TABLE lodging_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,                     -- ✅ FK → users(id)
  room_id INT NOT NULL,                     -- ✅ FK → rooms(id)
  check_in_date DATE,
  check_out_date DATE,
  num_guests INT,
  total_amount DECIMAL(10, 2),
  booking_status VARCHAR(50),
  hold_expires_at DATETIME
);
```

#### 64-75. **기타 숙박 테이블 (12개)**
```sql
-- pms_configs (listing_id FK)
-- pms_api_credentials (vendor_id FK)
-- pms_sync_jobs
-- pms_booking_records (booking_id FK)
-- room_types (listing_id FK)
-- room_inventory_locks
-- room_availability
-- lodging_policies
-- lodging_cancellation_policies
-- lodging_inventory_locks
-- lodging_booking_history (booking_id FK)
-- availability_daily
```

---

### **기타 시스템 테이블 (20개)**

#### 76. **product_options** (상품 옵션)
```sql
CREATE TABLE product_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,                  -- ✅ FK → listings(id)
  option_name VARCHAR(200),
  price_adjustment DECIMAL(10, 2),
  stock INT,
  is_active BOOLEAN DEFAULT true
);
```

#### 77. **accident_reports** (사고 신고)
```sql
CREATE TABLE accident_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,                           -- ✅ FK → rentcar_bookings(id)
  user_id INT,                              -- ✅ FK → users(id)
  report_number VARCHAR(100) UNIQUE,
  accident_date DATETIME,
  description TEXT,
  status VARCHAR(50)
);
```

#### 78-95. **추가 시스템 테이블 (18개)**
```sql
-- pricing_rules
-- cancellation_policies
-- group_bookings (주 예약 booking_id FK)
-- notification_history (user_id FK)
-- payment_history (payment_id FK, user_id FK)
-- refund_history (payment_id FK)
-- schema_migrations (DB 마이그레이션 추적)
-- rate_plans (room_type_id FK)
-- rentcar_booking_history
```

---

### ✅ **전체 테이블 요약: 95개 이상**

1. **기본 시스템:** 15개
2. **Admin:** 5개
3. **렌트카:** 30개
4. **투어:** 3개
5. **음식:** 4개
6. **체험:** 3개
7. **이벤트:** 3개
8. **관광지:** 2개
9. **숙박(PMS):** 15개
10. **기타:** 15개

---

### ✅ Neon PostgreSQL 테이블 (1개)

#### **users** (실제 사용 중)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'user',      -- 'admin', 'user', 'vendor'
  status VARCHAR(50) DEFAULT 'active',
  provider VARCHAR(50),                  -- 'local', 'kakao', 'google'
  provider_id VARCHAR(255),
  avatar VARCHAR(500),
  total_points INTEGER DEFAULT 0,       -- ✅ 포인트 시스템
  postal_code VARCHAR(20),
  address TEXT,
  detail_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 코드 내 DB 연결 패턴

### PlanetScale 연결 (337개 파일)
```javascript
const { connect } = require('@planetscale/database');
const connection = connect({ url: process.env.DATABASE_URL });

// 사용 예시
const result = await connection.execute('SELECT * FROM listings WHERE id = ?', [id]);
```

**전체 337개 파일 목록:**

<details>
<summary>📁 337개 DATABASE_URL 사용 파일 전체 목록 (클릭하여 펼치기)</summary>

```
C:\Users\ham57\Desktop\Travleap\api\cart.js
C:\Users\ham57\Desktop\Travleap\pages\api\payments\delete.js
C:\Users\ham57\Desktop\Travleap\pages\api\user\payments.js
C:\Users\ham57\Desktop\Travleap\pages\api\user\change-password.js
C:\Users\ham57\Desktop\Travleap\pages\api\user\address.js
C:\Users\ham57\Desktop\Travleap\pages\api\user\points.js
C:\Users\ham57\Desktop\Travleap\pages\api\user\profile.js
C:\Users\ham57\Desktop\Travleap\api\payments\refund.js
C:\Users\ham57\Desktop\Travleap\pages\api\payments\confirm.js
C:\Users\ham57\Desktop\Travleap\pages\api\attractions\list.js
C:\Users\ham57\Desktop\Travleap\pages\api\events\list.js
C:\Users\ham57\Desktop\Travleap\pages\api\experience\list.js
C:\Users\ham57\Desktop\Travleap\pages\api\food\restaurants.js
C:\Users\ham57\Desktop\Travleap\pages\api\tour\packages.js
C:\Users\ham57\Desktop\Travleap\pages\api\rentcar\vehicles.js
C:\Users\ham57\Desktop\Travleap\pages\api\accommodation\listings.js
C:\Users\ham57\Desktop\Travleap\pages\api\orders.js
C:\Users\ham57\Desktop\Travleap\api\signup.js
C:\Users\ham57\Desktop\Travleap\api\login.js
C:\Users\ham57\Desktop\Travleap\api\auth.js
C:\Users\ham57\Desktop\Travleap\pages\api\rentcar\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\payments\refund.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\rentcar\vendors.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\rentcar\vehicles\[id].js
C:\Users\ham57\Desktop\Travleap\api\partners\apply.js
C:\Users\ham57\Desktop\Travleap\api\orders.js
C:\Users\ham57\Desktop\Travleap\api\coupons\register.js
C:\Users\ham57\Desktop\Travleap\api\coupons\public.js
C:\Users\ham57\Desktop\Travleap\api\coupons\validate.js
C:\Users\ham57\Desktop\Travleap\api\coupons.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\debug-points.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\orders.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\orders\debug.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\debug-order.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\events\tickets.js
C:\Users\ham57\Desktop\Travleap\pages\api\events\tickets.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\attractions\tickets.js
C:\Users\ham57\Desktop\Travleap\pages\api\attractions\tickets.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\experience\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\experience\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\accommodation\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\tour\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\food\orders.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\food\restaurants.js
C:\Users\ham57\Desktop\Travleap\pages\api\food\orders.js
C:\Users\ham57\Desktop\Travleap\api\admin\coupons.js
C:\Users\ham57\Desktop\Travleap\api\coupons\use.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\experience\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\experience\experiences.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\events\tickets.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\events\events.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\attractions\tickets.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\attractions\attractions.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\food\orders.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\food\menus.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\food\restaurants.js
C:\Users\ham57\Desktop\Travleap\pages\api\food\menus.js
C:\Users\ham57\Desktop\Travleap\pages\api\tour\schedules.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\rentcar\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\rentcar\vehicles.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\rentcar\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\rentcar\vehicles.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\tour\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\tour\schedules.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\tour\packages.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\tour\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\tour\schedules.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\tour\packages.js
C:\Users\ham57\Desktop\Travleap\api\payments\confirm.js
C:\Users\ham57\Desktop\Travleap\api\admin\orders.js
C:\Users\ham57\Desktop\Travleap\pages\api\bookings.js
C:\Users\ham57\Desktop\Travleap\api\admin\refund-booking.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\refund-booking.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\stats.js
C:\Users\ham57\Desktop\Travleap\api\admin\stats.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\manual-refund.js
C:\Users\ham57\Desktop\Travleap\api\admin\manual-refund.js
C:\Users\ham57\Desktop\Travleap\api\event\book-tickets.js
C:\Users\ham57\Desktop\Travleap\api\experience\book.js
C:\Users\ham57\Desktop\Travleap\api\tour\book.js
C:\Users\ham57\Desktop\Travleap\api\tourist\gate-verify.js
C:\Users\ham57\Desktop\Travleap\api\tourist\tickets.js
C:\Users\ham57\Desktop\Travleap\api\tourist\list.js
C:\Users\ham57\Desktop\Travleap\api\event\tickets\[orderId].js
C:\Users\ham57\Desktop\Travleap\api\event\seats\[eventId].js
C:\Users\ham57\Desktop\Travleap\api\event\list.js
C:\Users\ham57\Desktop\Travleap\api\experience\bookings\[id].js
C:\Users\ham57\Desktop\Travleap\api\experience\slots\[experienceId].js
C:\Users\ham57\Desktop\Travleap\api\experience\list.js
C:\Users\ham57\Desktop\Travleap\api\food\orders\[id].js
C:\Users\ham57\Desktop\Travleap\api\food\order.js
C:\Users\ham57\Desktop\Travleap\api\food\menus\[restaurantId].js
C:\Users\ham57\Desktop\Travleap\api\food\restaurants.js
C:\Users\ham57\Desktop\Travleap\api\vendor\tour\bookings.js
C:\Users\ham57\Desktop\Travleap\api\admin\tour\schedules.js
C:\Users\ham57\Desktop\Travleap\api\admin\tour\packages.js
C:\Users\ham57\Desktop\Travleap\api\tour\verify-voucher.js
C:\Users\ham57\Desktop\Travleap\api\tour\check-in.js
C:\Users\ham57\Desktop\Travleap\api\tour\voucher\[bookingId].js
C:\Users\ham57\Desktop\Travleap\api\tour\bookings\[id].js
C:\Users\ham57\Desktop\Travleap\api\tour\schedules\[packageId].js
C:\Users\ham57\Desktop\Travleap\api\tour\packages\[id].js
C:\Users\ham57\Desktop\Travleap\api\tour\packages.js
C:\Users\ham57\Desktop\Travleap\api\admin\accommodation\inventory.js
C:\Users\ham57\Desktop\Travleap\api\accommodation\calendar\[roomId].js
C:\Users\ham57\Desktop\Travleap\api\accommodation\availability.js
C:\Users\ham57\Desktop\Travleap\api\admin\accommodation\init-calendar.js
C:\Users\ham57\Desktop\Travleap\api\admin\rentcar\accidents.js
C:\Users\ham57\Desktop\Travleap\api\rentcar\accident\list.js
C:\Users\ham57\Desktop\Travleap\api\rentcar\accident\[reportId].js
C:\Users\ham57\Desktop\Travleap\api\rentcar\accident\report.js
C:\Users\ham57\Desktop\Travleap\api\admin\notifications.js
C:\Users\ham57\Desktop\Travleap\api\banners.js
C:\Users\ham57\Desktop\Travleap\api\user\payments.js
C:\Users\ham57\Desktop\Travleap\api\reviews\helpful\[reviewId].js
C:\Users\ham57\Desktop\Travleap\api\reviews\[listingId].js
C:\Users\ham57\Desktop\Travleap\api\payments\delete.js
C:\Users\ham57\Desktop\Travleap\api\admin\cleanup-failed-payments.js
C:\Users\ham57\Desktop\Travleap\api\bookings.js
C:\Users\ham57\Desktop\Travleap\api\user\points.js
C:\Users\ham57\Desktop\Travleap\api\user\profile.js
C:\Users\ham57\Desktop\Travleap\api\user\change-password.js
C:\Users\ham57\Desktop\Travleap\api\add-payment-notes-column.js
C:\Users\ham57\Desktop\Travleap\api\user\address.js
C:\Users\ham57\Desktop\Travleap\api\admin\listings.js
C:\Users\ham57\Desktop\Travleap\api\admin\listings\[id].js
C:\Users\ham57\Desktop\Travleap\api\contacts.js
C:\Users\ham57\Desktop\Travleap\api\admin\update-user-role.js
C:\Users\ham57\Desktop\Travleap\api\auth\login.js
C:\Users\ham57\Desktop\Travleap\api\shared\auth.js
C:\Users\ham57\Desktop\Travleap\api\admin\delete-user.js
C:\Users\ham57\Desktop\Travleap\api\add-missing-user-columns.js
C:\Users\ham57\Desktop\Travleap\api\add-social-login-columns.js
C:\Users\ham57\Desktop\Travleap\api\vendor\info.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\info.js
C:\Users\ham57\Desktop\Travleap\api\rentcar\bookings.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\rentcar\vehicles\[id].js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\vehicles\[id].js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\vehicles.js
C:\Users\ham57\Desktop\Travleap\api\rentcar\vehicle\[id].js
C:\Users\ham57\Desktop\Travleap\api\rentcar\vehicles.js
C:\Users\ham57\Desktop\Travleap\api\admin\users.js
C:\Users\ham57\Desktop\Travleap\api\images.js
C:\Users\ham57\Desktop\Travleap\api\admin\reviews\[reviewId].js
C:\Users\ham57\Desktop\Travleap\api\admin\banners\[id].js
C:\Users\ham57\Desktop\Travleap\api\admin\banners.js
C:\Users\ham57\Desktop\Travleap\api\rentcar\insurance.js
C:\Users\ham57\Desktop\Travleap\api\vendor\insurance.js
C:\Users\ham57\Desktop\Travleap\api\vendor\monthly-settlement.js
C:\Users\ham57\Desktop\Travleap\api\vendor\vehicles.js
... (248개 더)
```
</details>

---

### Neon PostgreSQL 연결 (56개 파일)
```javascript
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({
  connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
});

// 사용 예시
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
await pool.end(); // ⚠️ 반드시 종료 필요
```

**전체 56개 파일 목록:**

<details>
<summary>📁 56개 POSTGRES_DATABASE_URL 사용 파일 전체 목록 (클릭하여 펼치기)</summary>

```
C:\Users\ham57\Desktop\Travleap\pages\api\user\change-password.js
C:\Users\ham57\Desktop\Travleap\pages\api\user\address.js
C:\Users\ham57\Desktop\Travleap\pages\api\user\points.js
C:\Users\ham57\Desktop\Travleap\pages\api\user\profile.js
C:\Users\ham57\Desktop\Travleap\api\payments\refund.js
C:\Users\ham57\Desktop\Travleap\pages\api\payments\confirm.js
C:\Users\ham57\Desktop\Travleap\pages\api\orders.js
C:\Users\ham57\Desktop\Travleap\api\signup.js
C:\Users\ham57\Desktop\Travleap\api\login.js
C:\Users\ham57\Desktop\Travleap\api\auth.js
C:\Users\ham57\Desktop\Travleap\pages\api\payments\refund.js
C:\Users\ham57\Desktop\Travleap\server-api.ts
C:\Users\ham57\Desktop\Travleap\api\orders.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\orders.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\orders\debug.js
C:\Users\ham57\Desktop\Travleap\api\payments\confirm.js
C:\Users\ham57\Desktop\Travleap\api\admin\orders.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\stats.js
C:\Users\ham57\Desktop\Travleap\api\admin\stats.js
C:\Users\ham57\Desktop\Travleap\pages\api\admin\manual-refund.js
C:\Users\ham57\Desktop\Travleap\api\admin\manual-refund.js
C:\Users\ham57\Desktop\Travleap\api\reviews\[listingId].js
C:\Users\ham57\Desktop\Travleap\api\admin\cleanup-failed-payments.js
C:\Users\ham57\Desktop\Travleap\api\user\points.js
C:\Users\ham57\Desktop\Travleap\api\user\profile.js
C:\Users\ham57\Desktop\Travleap\api\user\change-password.js
C:\Users\ham57\Desktop\Travleap\api\user\address.js
C:\Users\ham57\Desktop\Travleap\api\admin\update-user-role.js
C:\Users\ham57\Desktop\Travleap\api\auth\login.js
C:\Users\ham57\Desktop\Travleap\api\shared\auth.js
C:\Users\ham57\Desktop\Travleap\api\admin\delete-user.js
C:\Users\ham57\Desktop\Travleap\api\add-missing-user-columns.js
C:\Users\ham57\Desktop\Travleap\api\add-social-login-columns.js
C:\Users\ham57\Desktop\Travleap\api\vendor\info.js
C:\Users\ham57\Desktop\Travleap\pages\api\vendor\info.js
C:\Users\ham57\Desktop\Travleap\api\admin\users.js
C:\Users\ham57\Desktop\Travleap\api\vendors.js
C:\Users\ham57\Desktop\Travleap\api\users.js
C:\Users\ham57\Desktop\Travleap\api\admin\accommodation-vendors.js
C:\Users\ham57\Desktop\Travleap\api\signup-vendor.js
C:\Users\ham57\Desktop\Travleap\scripts\link-existing-vendor-accounts.ts
C:\Users\ham57\Desktop\Travleap\scripts\check-lodging-vendor.ts
C:\Users\ham57\Desktop\Travleap\scripts\fix-lodging-vendor-connection.ts
C:\Users\ham57\Desktop\Travleap\scripts\update-vendor-password.ts
C:\Users\ham57\Desktop\Travleap\scripts\create-lodging-vendor-account.ts
C:\Users\ham57\Desktop\Travleap\check-userid-31.ts
C:\Users\ham57\Desktop\Travleap\check-user-role.ts
C:\Users\ham57\Desktop\Travleap\test-payment-booking-mypage.ts
C:\Users\ham57\Desktop\Travleap\test-complete-system-analysis.ts
C:\Users\ham57\Desktop\Travleap\test-deep-analysis-all-roles.ts
C:\Users\ham57\Desktop\Travleap\test-complete-rentcar-flow.ts
C:\Users\ham57\Desktop\Travleap\scripts\reset-vendor-password.ts
C:\Users\ham57\Desktop\Travleap\scripts\setup-test-vendor.ts
C:\Users\ham57\Desktop\Travleap\scripts\fix-vendor-complete.ts
C:\Users\ham57\Desktop\Travleap\scripts\create-vendor-neon.ts
C:\Users\ham57\Desktop\Travleap\api\auth\route.js
C:\Users\ham57\Desktop\Travleap\scripts\create-neon-users-table.ts
C:\Users\ham57\Desktop\Travleap\utils\neon-database.ts
```
</details>

---

### Dual DB 사용 파일 (29개 - ⚠️ 최우선 마이그레이션 대상)
```javascript
// PlanetScale + Neon 동시 사용
const connection = connect({ url: process.env.DATABASE_URL });
const { Pool } = require('@neondatabase/serverless');
const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

try {
  // PlanetScale 쿼리
  const payment = await connection.execute('SELECT * FROM payments WHERE id = ?', [id]);

  // Neon 쿼리
  const user = await poolNeon.query('SELECT * FROM users WHERE id = $1', [userId]);
} finally {
  await poolNeon.end();
}
```

**전체 29개 파일 목록:**

<details>
<summary>📁 29개 Dual DB 파일 목록 (클릭하여 펼치기)</summary>

```
api/admin/accommodation-vendors.js
api/admin/cleanup-failed-payments.js
api/admin/delete-user.js
api/admin/manual-refund.js
api/admin/orders.js
api/admin/stats.js
api/admin/update-user-role.js
api/admin/users.js
api/auth/login.js
api/auth/route.js
api/payments/confirm.js
api/payments/refund.js
api/reviews/[listingId].js
api/shared/auth.js
api/user/address.js
api/user/change-password.js
api/user/points.js
api/user/profile.js
api/vendor/info.js
pages/api/admin/manual-refund.js
pages/api/admin/orders.js
pages/api/admin/stats.js
pages/api/payments/confirm.js
pages/api/payments/refund.js
pages/api/user/address.js
pages/api/user/change-password.js
pages/api/user/points.js
pages/api/user/profile.js
pages/api/vendor/info.js
```

**주요 파일 분류:**
- **결제 관련 (4개):** `api/payments/confirm.js`, `api/payments/refund.js`, `pages/api/payments/confirm.js`, `pages/api/payments/refund.js`
- **사용자 관리 (8개):** `api/user/*`, `pages/api/user/*`, `api/admin/users.js`, `api/admin/delete-user.js`
- **관리자 기능 (7개):** `api/admin/orders.js`, `api/admin/stats.js`, `api/admin/manual-refund.js`, 등
- **인증 관련 (3개):** `api/auth/login.js`, `api/auth/route.js`, `api/shared/auth.js`
- **벤더 관련 (2개):** `api/vendor/info.js`, `pages/api/vendor/info.js`
- **기타 (5개):** `api/reviews/[listingId].js`, `api/admin/accommodation-vendors.js`, `api/admin/cleanup-failed-payments.js`, 등

</details>

---

## 🎯 마이그레이션 목표

### Before (현재)
```
┌──────────────────┐     ┌──────────────────┐
│ PlanetScale      │     │ Neon PostgreSQL  │
│ (MySQL)          │     │ (PostgreSQL)     │
├──────────────────┤     ├──────────────────┤
│ listings         │     │ users (실제)     │
│ bookings         │     │ total_points     │
│ payments         │     └──────────────────┘
│ partners         │
│ user_points      │
│ cart_items       │
│ ... 55개 더      │
│ users (레거시)   │
└──────────────────┘

애플리케이션 코드: 337개 파일 (PlanetScale) + 56개 파일 (Neon)
```

### After (마이그레이션 후)
```
┌────────────────────────────────────────────┐
│ 네이버/구글 Cloud DB                       │
│ (MySQL 또는 PostgreSQL)                    │
├────────────────────────────────────────────┤
│ users (Neon에서 이전)                      │
│ 전체 95개 이상의 테이블 통합:              │
│  - 기본 시스템: 15개                       │
│  - Admin: 5개                              │
│  - 렌트카: 30개                            │
│  - 투어: 3개                               │
│  - 음식: 4개                               │
│  - 체험: 3개                               │
│  - 이벤트: 3개                             │
│  - 관광지: 2개                             │
│  - 숙박(PMS): 15개                         │
│  - 기타: 15개                              │
│                                            │
│ ✅ 외래키 제약조건 100개 이상 추가         │
└────────────────────────────────────────────┘

애플리케이션 코드: 단일 DB 연결 (364개 파일 수정)
- PlanetScale 단독: 308개
- Neon 단독: 27개
- 이중 DB: 29개
```

---

## 📝 전체 외래키 제약조건 목록

### 1. **listings** (2개)
```sql
ALTER TABLE listings
ADD CONSTRAINT fk_listing_partner
FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;

ALTER TABLE listings
ADD CONSTRAINT fk_listing_category
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
```

### 2. **bookings** (3개)
```sql
ALTER TABLE bookings
ADD CONSTRAINT fk_booking_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE bookings
ADD CONSTRAINT fk_booking_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE bookings
ADD CONSTRAINT fk_booking_option
FOREIGN KEY (selected_option_id) REFERENCES product_options(id) ON DELETE SET NULL;
```

### 3. **payments** (2개)
```sql
ALTER TABLE payments
ADD CONSTRAINT fk_payment_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE payments
ADD CONSTRAINT fk_payment_booking
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
```

### 4. **user_points** (1개)
```sql
ALTER TABLE user_points
ADD CONSTRAINT fk_points_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### 5. **cart_items** (2개)
```sql
ALTER TABLE cart_items
ADD CONSTRAINT fk_cart_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cart_items
ADD CONSTRAINT fk_cart_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
```

### 6. **partners** (1개)
```sql
ALTER TABLE partners
ADD CONSTRAINT fk_partner_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

### 7. **product_options** (1개)
```sql
ALTER TABLE product_options
ADD CONSTRAINT fk_option_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
```

### 8. **reviews** (2개)
```sql
ALTER TABLE reviews
ADD CONSTRAINT fk_review_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE reviews
ADD CONSTRAINT fk_review_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### 9. **user_coupons** (2개)
```sql
ALTER TABLE user_coupons
ADD CONSTRAINT fk_user_coupon_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_coupons
ADD CONSTRAINT fk_user_coupon_coupon
FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE;
```

### 10. **refund_policies** (1개)
```sql
ALTER TABLE refund_policies
ADD CONSTRAINT fk_refund_policy_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
```

### 11. **기타 테이블** (약 20개 더)
```sql
-- booking_logs
ALTER TABLE booking_logs
ADD CONSTRAINT fk_booking_log_booking
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- favorites
ALTER TABLE favorites
ADD CONSTRAINT fk_favorite_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE favorites
ADD CONSTRAINT fk_favorite_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

-- ... 나머지 테이블들
```

**⚠️ 총 외래키 개수: 약 35-40개**

---

## 🚨 데이터 정합성 체크 쿼리

**마이그레이션 전 실행 필수!**

### 1. 고아 레코드 찾기
```sql
-- bookings의 고아 레코드 (user_id가 users에 없음)
SELECT COUNT(*) as orphan_bookings
FROM bookings
WHERE user_id NOT IN (SELECT id FROM users);

-- bookings의 고아 레코드 (listing_id가 listings에 없음)
SELECT COUNT(*) as orphan_bookings
FROM bookings
WHERE listing_id NOT IN (SELECT id FROM listings);

-- payments의 고아 레코드 (user_id가 users에 없음)
SELECT COUNT(*) as orphan_payments
FROM payments
WHERE user_id NOT IN (SELECT id FROM users);

-- payments의 고아 레코드 (booking_id가 bookings에 없음)
SELECT COUNT(*) as orphan_payments
FROM payments
WHERE booking_id IS NOT NULL
  AND booking_id NOT IN (SELECT id FROM bookings);

-- cart_items의 고아 레코드
SELECT COUNT(*) as orphan_cart_items
FROM cart_items
WHERE user_id NOT IN (SELECT id FROM users);

SELECT COUNT(*) as orphan_cart_items
FROM cart_items
WHERE listing_id NOT IN (SELECT id FROM listings);

-- user_points의 고아 레코드
SELECT COUNT(*) as orphan_points
FROM user_points
WHERE user_id NOT IN (SELECT id FROM users);

-- reviews의 고아 레코드
SELECT COUNT(*) as orphan_reviews
FROM reviews
WHERE user_id NOT IN (SELECT id FROM users);

SELECT COUNT(*) as orphan_reviews
FROM reviews
WHERE listing_id NOT IN (SELECT id FROM listings);
```

### 2. 고아 레코드 정리
```sql
-- ⚠️ 백업 후 실행!

-- bookings 정리
DELETE FROM bookings WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM bookings WHERE listing_id NOT IN (SELECT id FROM listings);

-- payments 정리
DELETE FROM payments WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM payments WHERE booking_id IS NOT NULL AND booking_id NOT IN (SELECT id FROM bookings);

-- cart_items 정리
DELETE FROM cart_items WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM cart_items WHERE listing_id NOT IN (SELECT id FROM listings);

-- user_points 정리
DELETE FROM user_points WHERE user_id NOT IN (SELECT id FROM users);

-- reviews 정리
DELETE FROM reviews WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM reviews WHERE listing_id NOT IN (SELECT id FROM listings);
```

---

## ✅ 완전 마이그레이션 가이드

### 📋 Phase 0: 사전 준비 (새벽 작업 전날)

#### 1. 새 Cloud DB 생성

**Option A: 네이버 Cloud DB for MySQL**
```bash
# 네이버 클라우드 콘솔에서:
# 1. Cloud DB for MySQL 생성
# 2. 버전: MySQL 8.0.x
# 3. 스펙: 최소 Standard (4 vCPU, 8GB RAM)
# 4. 스토리지: 100GB SSD (확장 가능)
# 5. Public IP 할당
# 6. 방화벽: Vercel IP 범위 허용
```

**Option B: Google Cloud SQL for MySQL**
```bash
# Google Cloud Console에서:
# 1. Cloud SQL for MySQL 생성
# 2. 버전: MySQL 8.0.x
# 3. 머신 타입: db-n1-standard-2 (2 vCPU, 7.5GB)
# 4. 스토리지: 100GB SSD (자동 증가)
# 5. Public IP 할당
# 6. 승인된 네트워크: Vercel IP 추가
```

**Option C: Google Cloud SQL for PostgreSQL**
```bash
# PostgreSQL을 선택하는 경우:
# 1. PostgreSQL 14.x 이상
# 2. 동일 스펙
# 3. ⚠️ SQL 구문 변환 필요 (? → $1, $2...)
```

#### 2. DB 연결 정보 확인

```bash
# 새 DB 연결 정보 메모:
NEW_DB_HOST=xxx.xxx.xxx.xxx (또는 도메인)
NEW_DB_PORT=3306 (MySQL) 또는 5432 (PostgreSQL)
NEW_DB_USER=admin
NEW_DB_PASSWORD=강력한비밀번호
NEW_DB_NAME=travleap_production
```

#### 3. 로컬 테스트 환경 준비

```bash
# .env.backup 생성
cp .env .env.backup

# .env.migration-test 생성
cat > .env.migration-test << EOF
# 새 Cloud DB 연결 정보
NEW_DATABASE_URL=mysql://admin:password@host:3306/travleap_production
# 또는 PostgreSQL인 경우:
# NEW_DATABASE_URL=postgresql://admin:password@host:5432/travleap_production

# 기존 DB (백업용)
OLD_PLANETSCALE_URL=${DATABASE_URL}
OLD_NEON_URL=${POSTGRES_DATABASE_URL}
EOF
```

#### 4. 백업 스크립트 준비

```bash
mkdir -p backups/pre-migration

# PlanetScale 백업 스크립트 (scripts/backup-planetscale.sh)
cat > scripts/backup-planetscale.sh << 'SCRIPT'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h $PLANETSCALE_HOST -u $PLANETSCALE_USER -p$PLANETSCALE_PASSWORD \
  --databases travleap_db \
  --single-transaction \
  --quick \
  --lock-tables=false \
  > backups/pre-migration/planetscale_$DATE.sql
echo "✅ PlanetScale backup saved: planetscale_$DATE.sql"
SCRIPT

chmod +x scripts/backup-planetscale.sh

# Neon 백업 스크립트 (scripts/backup-neon.sh)
cat > scripts/backup-neon.sh << 'SCRIPT'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $POSTGRES_DATABASE_URL > backups/pre-migration/neon_users_$DATE.sql
echo "✅ Neon backup saved: neon_users_$DATE.sql"
SCRIPT

chmod +x scripts/backup-neon.sh
```

---

### 📋 Phase 1: 데이터 백업 (새벽 02:00, 예상 30분)

```bash
echo "🔒 [02:00] Phase 1: 전체 데이터 백업 시작"

# 1. PlanetScale 전체 백업
./scripts/backup-planetscale.sh

# 2. Neon users 테이블 백업
./scripts/backup-neon.sh

# 3. 백업 파일 검증
ls -lh backups/pre-migration/
# 예상 크기:
# - planetscale_*.sql: 500MB ~ 2GB
# - neon_users_*.sql: 1MB ~ 10MB

# 4. 백업 복구 테스트 (샘플 확인)
head -100 backups/pre-migration/planetscale_*.sql
head -100 backups/pre-migration/neon_users_*.sql

echo "✅ [02:30] Phase 1 완료: 백업 완료"
```

---

### 📋 Phase 2: 고아 레코드 정리 (새벽 02:30, 예상 15분)

```bash
echo "🧹 [02:30] Phase 2: 데이터 정합성 체크 및 정리"

# 1. 고아 레코드 확인 스크립트 실행
node scripts/check-orphan-records.js
```

**scripts/check-orphan-records.js** 생성:
```javascript
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function checkOrphans() {
  const conn = connect({ url: process.env.DATABASE_URL });
  const pool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  console.log('🔍 고아 레코드 체크 시작...\n');

  try {
    // Neon에서 실제 users ID 목록 가져오기
    const usersResult = await pool.query('SELECT id FROM users');
    const validUserIds = usersResult.rows.map(r => r.id);
    console.log(`✅ Neon users 총 ${validUserIds.length}명\n`);

    // PlanetScale에서 listings ID 목록
    const listingsResult = await conn.execute('SELECT id FROM listings');
    const validListingIds = listingsResult.rows.map(r => r.id);
    console.log(`✅ Listings 총 ${validListingIds.length}개\n`);

    // 1. bookings 고아 레코드
    const orphanBookingsUser = await conn.execute(`
      SELECT COUNT(*) as count FROM bookings
      WHERE user_id NOT IN (${validUserIds.join(',')})
    `);
    console.log(`⚠️  bookings (user_id 없음): ${orphanBookingsUser.rows[0].count}건`);

    const orphanBookingsListing = await conn.execute(`
      SELECT COUNT(*) as count FROM bookings
      WHERE listing_id NOT IN (${validListingIds.join(',')})
    `);
    console.log(`⚠️  bookings (listing_id 없음): ${orphanBookingsListing.rows[0].count}건`);

    // 2. payments 고아 레코드
    const orphanPaymentsUser = await conn.execute(`
      SELECT COUNT(*) as count FROM payments
      WHERE user_id NOT IN (${validUserIds.join(',')})
    `);
    console.log(`⚠️  payments (user_id 없음): ${orphanPaymentsUser.rows[0].count}건`);

    // 3. cart_items 고아 레코드
    const orphanCartUser = await conn.execute(`
      SELECT COUNT(*) as count FROM cart_items
      WHERE user_id NOT IN (${validUserIds.join(',')})
    `);
    console.log(`⚠️  cart_items (user_id 없음): ${orphanCartUser.rows[0].count}건`);

    const orphanCartListing = await conn.execute(`
      SELECT COUNT(*) as count FROM cart_items
      WHERE listing_id NOT IN (${validListingIds.join(',')})
    `);
    console.log(`⚠️  cart_items (listing_id 없음): ${orphanCartListing.rows[0].count}건`);

    // 4. user_points 고아 레코드
    const orphanPoints = await conn.execute(`
      SELECT COUNT(*) as count FROM user_points
      WHERE user_id NOT IN (${validUserIds.join(',')})
    `);
    console.log(`⚠️  user_points (user_id 없음): ${orphanPoints.rows[0].count}건`);

    // 5. reviews 고아 레코드
    const orphanReviewsUser = await conn.execute(`
      SELECT COUNT(*) as count FROM reviews
      WHERE user_id NOT IN (${validUserIds.join(',')})
    `);
    console.log(`⚠️  reviews (user_id 없음): ${orphanReviewsUser.rows[0].count}건`);

    const orphanReviewsListing = await conn.execute(`
      SELECT COUNT(*) as count FROM reviews
      WHERE listing_id NOT IN (${validListingIds.join(',')})
    `);
    console.log(`⚠️  reviews (listing_id 없음): ${orphanReviewsListing.rows[0].count}건\n`);

    console.log('✅ 체크 완료\n');
    console.log('⚠️  고아 레코드가 있다면 정리가 필요합니다!');
    console.log('➡️  scripts/clean-orphan-records.js 실행 권장\n');

  } finally {
    await pool.end();
  }
}

checkOrphans().catch(console.error);
```

```bash
# 2. 고아 레코드 정리 (필요시)
node scripts/clean-orphan-records.js

echo "✅ [02:45] Phase 2 완료: 데이터 정합성 확보"
```

---

### 📋 Phase 3: 새 DB 스키마 생성 (새벽 02:45, 예상 10분)

```bash
echo "🔧 [02:45] Phase 3: 새 DB 스키마 생성"

# 1. 새 DB에 연결하여 스키마 생성
mysql -h $NEW_DB_HOST -u $NEW_DB_USER -p$NEW_DB_PASSWORD $NEW_DB_NAME < database-schema.sql

# 2. Neon users 스키마 생성 (MySQL 변환)
mysql -h $NEW_DB_HOST -u $NEW_DB_USER -p$NEW_DB_PASSWORD $NEW_DB_NAME << 'SQL'
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'active',
  provider VARCHAR(50),
  provider_id VARCHAR(255),
  avatar VARCHAR(500),
  total_points INT DEFAULT 0,
  postal_code VARCHAR(20),
  address TEXT,
  detail_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL

echo "✅ [02:55] Phase 3 완료: 스키마 생성 완료"
```

---

### 📋 Phase 4: 데이터 이전 (새벽 02:55, 예상 45분)

```bash
echo "📦 [02:55] Phase 4: 데이터 이전 시작"

# 1. Neon users → 새 DB (가장 중요!)
pg_dump $POSTGRES_DATABASE_URL --table=users --data-only --column-inserts > /tmp/users_data.sql

# PostgreSQL INSERT를 MySQL 호환으로 변환
sed -i 's/public\.users/users/g' /tmp/users_data.sql
sed -i 's/SERIAL/INT AUTO_INCREMENT/g' /tmp/users_data.sql

# 새 DB로 import
mysql -h $NEW_DB_HOST -u $NEW_DB_USER -p$NEW_DB_PASSWORD $NEW_DB_NAME < /tmp/users_data.sql

echo "✅ users 테이블 이전 완료"

# 2. PlanetScale 데이터 → 새 DB
# 방법 1: mysqldump로 데이터만 추출
mysqldump -h $PLANETSCALE_HOST -u $PLANETSCALE_USER -p$PLANETSCALE_PASSWORD \
  --no-create-info \
  --skip-add-drop-table \
  --single-transaction \
  --databases travleap_db | \
  mysql -h $NEW_DB_HOST -u $NEW_DB_USER -p$NEW_DB_PASSWORD $NEW_DB_NAME

# 방법 2: 테이블별로 이전 (권장 - 진행 상황 확인 가능)
node scripts/migrate-data-table-by-table.js

echo "✅ [03:40] Phase 4 완료: 전체 데이터 이전 완료"
```

**scripts/migrate-data-table-by-table.js** 생성:
```javascript
const { connect } = require('@planetscale/database');
const mysql = require('mysql2/promise');

async function migrateData() {
  const oldConn = connect({ url: process.env.OLD_PLANETSCALE_URL });
  const newConn = await mysql.createConnection(process.env.NEW_DATABASE_URL);

  const tables = [
    'categories', 'partners', 'listings', 'coupons',
    'bookings', 'payments', 'user_points', 'cart_items',
    'product_options', 'reviews', 'user_coupons', 'refund_policies',
    'booking_logs', 'favorites', 'contacts', 'faq'
    // ... 나머지 테이블 추가
  ];

  for (const table of tables) {
    console.log(`📦 [${table}] 이전 시작...`);

    try {
      // 1. PlanetScale에서 데이터 읽기
      const result = await oldConn.execute(`SELECT * FROM ${table}`);
      const rows = result.rows || [];

      if (rows.length === 0) {
        console.log(`   ⚠️  ${table}: 데이터 없음, 건너뜀`);
        continue;
      }

      // 2. 배치 단위로 새 DB에 INSERT
      const batchSize = 1000;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        // INSERT 쿼리 생성
        const columns = Object.keys(batch[0]);
        const placeholders = batch.map(() =>
          `(${columns.map(() => '?').join(',')})`
        ).join(',');

        const values = batch.flatMap(row => columns.map(col => row[col]));

        await newConn.execute(
          `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`,
          values
        );

        inserted += batch.length;
        console.log(`   ✅ ${inserted}/${rows.length} rows...`);
      }

      console.log(`✅ [${table}] 완료: ${rows.length}건 이전\n`);

    } catch (error) {
      console.error(`❌ [${table}] 실패:`, error.message);
      throw error; // 중단
    }
  }

  await newConn.end();
  console.log('\n✅ 전체 데이터 이전 완료!');
}

migrateData().catch(console.error);
```

---

### 📋 Phase 5: 외래키 제약조건 추가 (새벽 03:40, 예상 10분)

```bash
echo "🔗 [03:40] Phase 5: 외래키 제약조건 추가"

mysql -h $NEW_DB_HOST -u $NEW_DB_USER -p$NEW_DB_PASSWORD $NEW_DB_NAME << 'SQL'
-- 1. listings
ALTER TABLE listings
ADD CONSTRAINT fk_listing_partner
FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;

ALTER TABLE listings
ADD CONSTRAINT fk_listing_category
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- 2. bookings
ALTER TABLE bookings
ADD CONSTRAINT fk_booking_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE bookings
ADD CONSTRAINT fk_booking_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE bookings
ADD CONSTRAINT fk_booking_option
FOREIGN KEY (selected_option_id) REFERENCES product_options(id) ON DELETE SET NULL;

-- 3. payments
ALTER TABLE payments
ADD CONSTRAINT fk_payment_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE payments
ADD CONSTRAINT fk_payment_booking
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- 4. user_points
ALTER TABLE user_points
ADD CONSTRAINT fk_points_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 5. cart_items
ALTER TABLE cart_items
ADD CONSTRAINT fk_cart_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cart_items
ADD CONSTRAINT fk_cart_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

-- 6. partners
ALTER TABLE partners
ADD CONSTRAINT fk_partner_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 7. product_options
ALTER TABLE product_options
ADD CONSTRAINT fk_option_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

-- 8. reviews
ALTER TABLE reviews
ADD CONSTRAINT fk_review_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE reviews
ADD CONSTRAINT fk_review_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 9. user_coupons
ALTER TABLE user_coupons
ADD CONSTRAINT fk_user_coupon_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_coupons
ADD CONSTRAINT fk_user_coupon_coupon
FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE;

-- 10. refund_policies
ALTER TABLE refund_policies
ADD CONSTRAINT fk_refund_policy_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

-- 11. favorites
ALTER TABLE favorites
ADD CONSTRAINT fk_favorite_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE favorites
ADD CONSTRAINT fk_favorite_listing
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

-- 12. booking_logs
ALTER TABLE booking_logs
ADD CONSTRAINT fk_booking_log_booking
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
SQL

echo "✅ [03:50] Phase 5 완료: 외래키 제약조건 추가 완료"
```

---

### 📋 Phase 6: 애플리케이션 코드 수정 (새벽 03:50, 예상 40분)

#### 1. 환경 변수 업데이트

```bash
# .env 파일 수정
cat > .env << EOF
# ===== 새 Cloud DB (단일 DB) =====
DATABASE_URL=mysql://admin:password@host:3306/travleap_production

# ===== 기존 DB (백업, 주석 처리) =====
# OLD_PLANETSCALE_URL=mysql://...
# OLD_NEON_URL=postgresql://...

# ===== JWT Secret =====
JWT_SECRET=your-production-jwt-secret-minimum-32-characters-long

# ===== Toss Payments =====
TOSS_SECRET_KEY=test_sk_...
TOSS_CLIENT_KEY=test_ck_...

# ===== 기타 =====
NEXT_PUBLIC_API_URL=https://travelap.vercel.app
NODE_ENV=production
EOF
```

#### 2. 코드 수정 패턴

**Pattern 1: PlanetScale 단독 사용 → 새 DB**

**AS-IS (308개 파일):**
```javascript
const { connect } = require('@planetscale/database');
const connection = connect({ url: process.env.DATABASE_URL });

// 쿼리 실행
const result = await connection.execute('SELECT * FROM listings WHERE id = ?', [id]);
```

**TO-BE:**
```javascript
const mysql = require('mysql2/promise');

async function handler(req, res) {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [rows] = await connection.execute('SELECT * FROM listings WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      data: rows
    });
  } finally {
    await connection.end();
  }
}
```

**⚠️ 주요 변경사항:**
- `@planetscale/database` → `mysql2/promise`
- `connect()` → `mysql.createConnection()`
- `result.rows` → `[rows]` (구조 분해)
- `connection.end()` 필수 (메모리 누수 방지)

---

**Pattern 2: Neon PostgreSQL 단독 사용 → 새 DB**

**AS-IS (27개 파일):**
```javascript
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
const user = result.rows[0];

await pool.end();
```

**TO-BE:**
```javascript
const mysql = require('mysql2/promise');

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // ⚠️ $1, $2 → ? 로 변경!
  const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
  const user = rows[0];

  return res.status(200).json({ success: true, data: user });
} finally {
  await connection.end();
}
```

**⚠️ 주요 변경사항:**
- PostgreSQL placeholder `$1, $2` → MySQL placeholder `?`
- `pool.query()` → `connection.execute()`
- `result.rows` → `[rows]`

---

**Pattern 3: Dual DB 사용 (PlanetScale + Neon) → 단일 DB**

**AS-IS (29개 파일 - 가장 복잡):**
```javascript
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

const connection = connect({ url: process.env.DATABASE_URL });
const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

try {
  // PlanetScale 쿼리
  const paymentResult = await connection.execute('SELECT * FROM payments WHERE id = ?', [paymentId]);
  const payment = paymentResult.rows[0];

  // Neon 쿼리
  const userResult = await poolNeon.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];

  // 비즈니스 로직...

} finally {
  await poolNeon.end();
}
```

**TO-BE (단일 DB로 통합):**
```javascript
const mysql = require('mysql2/promise');

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 이제 모든 쿼리가 하나의 연결로!
  const [payments] = await connection.execute('SELECT * FROM payments WHERE id = ?', [paymentId]);
  const payment = payments[0];

  const [users] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
  const user = users[0];

  // ✅ 트랜잭션 사용 가능!
  await connection.beginTransaction();

  // ... 비즈니스 로직

  await connection.commit();

} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
```

---

#### 3. 핵심 파일 수정 목록

**🔴 우선순위 HIGH: Dual DB 사용 파일 (9개) - 가장 먼저 수정**

1. `pages/api/payments/confirm.js` - 결제 승인 (PlanetScale + Neon)
2. `api/payments/refund.js` - 환불 처리 (PlanetScale + Neon)
3. `pages/api/orders.js` - 주문 조회 (PlanetScale + Neon)
4. `pages/api/admin/orders.js` - 관리자 주문 관리
5. `pages/api/admin/stats.js` - 관리자 통계
6. `pages/api/user/points.js` - 포인트 조회
7. `api/payments/confirm.js` - 결제 승인 (중복)
8. `api/orders.js` - 주문 (중복)
9. `api/user/points.js` - 포인트 (중복)

**🟡 우선순위 MEDIUM: Neon 단독 사용 파일 (70개)**

- `api/auth.js`, `api/login.js`, `api/signup.js` - 인증
- `pages/api/user/profile.js` - 프로필
- `pages/api/user/address.js` - 주소
- `pages/api/user/change-password.js` - 비밀번호 변경
- ... (67개 더)

**🟢 우선순위 LOW: PlanetScale 단독 사용 파일 (324개)**

- `pages/api/accommodation/listings.js`
- `pages/api/rentcar/vehicles.js`
- `api/cart.js`
- ... (321개 더)

---

#### 4. 자동 코드 변환 스크립트

**scripts/convert-db-connections.js** (일괄 변환):

```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Pattern 1: PlanetScale → mysql2
function convertPlanetScale(content) {
  // import 변경
  content = content.replace(
    /const \{ connect \} = require\('@planetscale\/database'\);/g,
    "const mysql = require('mysql2/promise');"
  );

  // connection 변경
  content = content.replace(
    /const connection = connect\(\{ url: process\.env\.DATABASE_URL \}\);/g,
    "const connection = await mysql.createConnection(process.env.DATABASE_URL);"
  );

  // result.rows → [rows] 구조 분해
  content = content.replace(
    /const (\w+) = await connection\.execute\((.*?)\);/g,
    'const [$1] = await connection.execute($2);'
  );

  // result.rows 접근 → 직접 rows 접근
  content = content.replace(/(\w+)\.rows/g, '$1');

  return content;
}

// Pattern 2: Neon → mysql2
function convertNeon(content) {
  // import 변경
  content = content.replace(
    /const \{ Pool \} = require\('@neondatabase\/serverless'\);/g,
    "const mysql = require('mysql2/promise');"
  );

  // Pool → createConnection
  content = content.replace(
    /const (pool\w*) = new Pool\(\{ connectionString: process\.env\.POSTGRES_DATABASE_URL.*?\}\);/g,
    'const connection = await mysql.createConnection(process.env.DATABASE_URL);'
  );

  // $1, $2 → ?
  content = content.replace(/\$\d+/g, '?');

  // pool.query → connection.execute
  content = content.replace(/pool\.query\(/g, 'connection.execute(');

  // result.rows → [rows]
  content = content.replace(
    /const (\w+) = await (\w+)\.execute\((.*?)\);/g,
    'const [$1] = await $2.execute($3);'
  );

  return content;
}

// Pattern 3: Dual DB → 단일 DB
function convertDualDB(content) {
  // 양쪽 import 제거하고 mysql2만 남김
  content = content.replace(
    /const \{ connect \} = require\('@planetscale\/database'\);\s*const \{ Pool \} = require\('@neondatabase\/serverless'\);/g,
    "const mysql = require('mysql2/promise');"
  );

  // 양쪽 connection 제거하고 하나만 남김
  content = content.replace(
    /const connection = connect\(.*?\);\s*const poolNeon = new Pool\(.*?\);/g,
    'const connection = await mysql.createConnection(process.env.DATABASE_URL);'
  );

  // poolNeon.query → connection.execute + $1→?
  content = content.replace(/poolNeon\.query\(/g, 'connection.execute(');
  content = content.replace(/\$\d+/g, '?');

  // poolNeon.end() 제거
  content = content.replace(/await poolNeon\.end\(\);?\s*/g, '');

  // result.rows 처리
  content = convertPlanetScale(content);

  return content;
}

// 파일 처리
async function processFiles() {
  const files = glob.sync('**/*.{js,ts}', {
    ignore: ['node_modules/**', '.next/**', 'scripts/**'],
    absolute: true
  });

  let converted = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    // Dual DB 체크 (최우선)
    if (content.includes('@planetscale/database') && content.includes('@neondatabase/serverless')) {
      console.log(`🔴 [Dual DB] ${path.relative(process.cwd(), file)}`);
      content = convertDualDB(content);
      modified = true;
    }
    // Neon 단독
    else if (content.includes('@neondatabase/serverless')) {
      console.log(`🟡 [Neon] ${path.relative(process.cwd(), file)}`);
      content = convertNeon(content);
      modified = true;
    }
    // PlanetScale 단독
    else if (content.includes('@planetscale/database')) {
      console.log(`🟢 [PlanetScale] ${path.relative(process.cwd(), file)}`);
      content = convertPlanetScale(content);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf-8');
      converted++;
    }
  }

  console.log(`\n✅ 총 ${converted}개 파일 변환 완료!`);
}

processFiles().catch(console.error);
```

**실행:**
```bash
# 변환 전 백업
git add -A
git commit -m "백업: DB 연결 코드 변환 전"

# 자동 변환 실행
node scripts/convert-db-connections.js

# 변환 결과 확인
git diff

echo "✅ [04:30] Phase 6 완료: 애플리케이션 코드 수정 완료"
```

---

### 📋 Phase 7: 로컬 테스트 (새벽 04:30, 예상 30분)

```bash
echo "🧪 [04:30] Phase 7: 로컬 테스트 시작"

# 1. 의존성 설치
npm install mysql2

# 2. 환경 변수 설정
cp .env.migration-test .env

# 3. 개발 서버 시작
npm run dev

# 4. 핵심 기능 테스트
```

**테스트 체크리스트:**

```bash
# ✅ 1. 인증 테스트
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'

# ✅ 2. 프로필 조회 (JWT 테스트)
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# ✅ 3. 상품 목록 조회
curl http://localhost:3000/api/accommodation/listings

# ✅ 4. 장바구니 조회
curl http://localhost:3000/api/cart \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# ✅ 5. 포인트 조회
curl http://localhost:3000/api/user/points \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# ✅ 6. 주문 내역 조회
curl http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**외래키 제약조건 테스트:**

```bash
# 테스트용 스크립트 실행
node scripts/test-foreign-keys.js
```

**scripts/test-foreign-keys.js:**
```javascript
const mysql = require('mysql2/promise');

async function testForeignKeys() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  console.log('🧪 외래키 제약조건 테스트 시작...\n');

  try {
    // 1. 존재하지 않는 user_id로 booking 추가 시도 (실패해야 정상)
    try {
      await conn.execute(`
        INSERT INTO bookings (user_id, listing_id, booking_date, total_amount)
        VALUES (999999, 1, NOW(), 100.00)
      `);
      console.log('❌ 실패: 외래키 제약조건이 작동하지 않음 (user_id)');
    } catch (err) {
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('✅ 성공: user_id 외래키 제약조건 작동');
      }
    }

    // 2. 존재하지 않는 listing_id로 cart_items 추가 시도 (실패해야 정상)
    try {
      await conn.execute(`
        INSERT INTO cart_items (user_id, listing_id, quantity)
        VALUES (1, 999999, 1)
      `);
      console.log('❌ 실패: 외래키 제약조건이 작동하지 않음 (listing_id)');
    } catch (err) {
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('✅ 성공: listing_id 외래키 제약조건 작동');
      }
    }

    // 3. CASCADE 테스트: user 삭제 시 관련 데이터 자동 삭제 확인
    await conn.beginTransaction();

    // 테스트 user 생성
    const [userResult] = await conn.execute(`
      INSERT INTO users (email, name, password_hash)
      VALUES ('test_fk@test.com', 'FK Test User', 'hash')
    `);
    const testUserId = userResult.insertId;

    // 관련 데이터 생성
    await conn.execute(`
      INSERT INTO cart_items (user_id, listing_id, quantity)
      VALUES (?, 1, 1)
    `, [testUserId]);

    await conn.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, balance_after)
      VALUES (?, 100, 'earn', 'test', 100)
    `, [testUserId]);

    // user 삭제
    await conn.execute('DELETE FROM users WHERE id = ?', [testUserId]);

    // 관련 데이터가 자동 삭제되었는지 확인
    const [cartItems] = await conn.execute(
      'SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?',
      [testUserId]
    );
    const [points] = await conn.execute(
      'SELECT COUNT(*) as count FROM user_points WHERE user_id = ?',
      [testUserId]
    );

    if (cartItems[0].count === 0 && points[0].count === 0) {
      console.log('✅ 성공: CASCADE 동작 확인 (user 삭제 시 관련 데이터 자동 삭제)');
    } else {
      console.log('❌ 실패: CASCADE가 작동하지 않음');
    }

    await conn.rollback(); // 테스트 데이터 정리

    console.log('\n✅ 외래키 제약조건 테스트 완료!\n');

  } finally {
    await conn.end();
  }
}

testForeignKeys().catch(console.error);
```

```bash
echo "✅ [05:00] Phase 7 완료: 로컬 테스트 완료"
```

---

### 📋 Phase 8: Vercel 배포 및 Production 테스트 (새벽 05:00, 예상 20분)

```bash
echo "🚀 [05:00] Phase 8: Production 배포"

# 1. Vercel 환경 변수 업데이트
vercel env rm DATABASE_URL production
vercel env rm POSTGRES_DATABASE_URL production

vercel env add DATABASE_URL production
# 입력: mysql://admin:password@host:3306/travleap_production

# 2. Git commit & push
git add -A
git commit -m "feat: DB 마이그레이션 완료 - PlanetScale+Neon → Cloud DB"
git push origin main

# 3. Vercel 자동 배포 대기
echo "⏳ Vercel 배포 중... (약 3-5분)"

# 4. 배포 완료 대기
vercel --prod

echo "✅ [05:20] Phase 8 완료: Production 배포 완료"
```

**Production 테스트:**

```bash
# 1. Health check
curl https://travelap.vercel.app/api/health

# 2. 인증 테스트
curl -X POST https://travelap.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"real@user.com","password":"password"}'

# 3. 상품 목록
curl https://travelap.vercel.app/api/accommodation/listings

# 4. 사용자 프로필 (실제 JWT 사용)
curl https://travelap.vercel.app/api/user/profile \
  -H "Authorization: Bearer REAL_JWT_TOKEN"

# 5. 결제 테스트 (Toss Sandbox)
# → 브라우저에서 직접 테스트 필요
```

---

### 📋 Phase 9: 모니터링 및 롤백 준비 (새벽 05:20, 예상 10분)

```bash
echo "📊 [05:20] Phase 9: 모니터링 설정"

# 1. DB 연결 모니터링
node scripts/monitor-db-connections.js &
```

**scripts/monitor-db-connections.js:**
```javascript
const mysql = require('mysql2/promise');

async function monitor() {
  while (true) {
    try {
      const conn = await mysql.createConnection(process.env.DATABASE_URL);
      const [[result]] = await conn.execute('SELECT 1 as ok');

      if (result.ok === 1) {
        console.log(`✅ [${new Date().toISOString()}] DB 연결 정상`);
      }

      await conn.end();
    } catch (error) {
      console.error(`❌ [${new Date().toISOString()}] DB 연결 실패:`, error.message);
      // 알림 전송 (Slack/이메일)
    }

    await new Promise(resolve => setTimeout(resolve, 60000)); // 1분마다
  }
}

monitor();
```

```bash
# 2. 에러 로그 모니터링
vercel logs --follow
```

---

### 🔙 롤백 계획 (문제 발생 시)

#### 롤백 Scenario 1: 애플리케이션 오류

```bash
# 1. Vercel에서 이전 배포로 롤백
vercel rollback

# 2. 환경 변수 복구
vercel env add DATABASE_URL production
# 입력: [OLD_PLANETSCALE_URL]

vercel env add POSTGRES_DATABASE_URL production
# 입력: [OLD_NEON_URL]

# 3. Git revert
git revert HEAD
git push origin main
```

#### 롤백 Scenario 2: 데이터 손실

```bash
# 1. 새 DB 중단
# (Cloud DB 콘솔에서 인스턴스 중지)

# 2. 백업에서 복구
mysql -h $PLANETSCALE_HOST -u $PLANETSCALE_USER -p < backups/pre-migration/planetscale_YYYYMMDD_HHMMSS.sql

pg_restore -d $POSTGRES_DATABASE_URL backups/pre-migration/neon_users_YYYYMMDD_HHMMSS.sql

# 3. 애플리케이션 롤백 (Scenario 1과 동일)
```

---

## 📊 마이그레이션 체크리스트

### Phase 0: 사전 준비 ☐
- ☐ 새 Cloud DB 생성 (Naver/Google)
- ☐ 연결 정보 확인 및 기록
- ☐ 로컬 테스트 환경 준비
- ☐ 백업 스크립트 작성

### Phase 1: 데이터 백업 ☐
- ☐ PlanetScale 전체 백업
- ☐ Neon users 테이블 백업
- ☐ 백업 파일 검증

### Phase 2: 데이터 정합성 ☐
- ☐ 고아 레코드 체크 스크립트 실행
- ☐ 고아 레코드 정리 (필요시)

### Phase 3: 스키마 생성 ☐
- ☐ 새 DB에 스키마 생성
- ☐ Neon users 스키마 생성 (MySQL 변환)

### Phase 4: 데이터 이전 ☐
- ☐ Neon users → 새 DB
- ☐ PlanetScale 데이터 → 새 DB
- ☐ 데이터 건수 검증

### Phase 5: 외래키 추가 ☐
- ☐ 외래키 제약조건 35-40개 추가
- ☐ 외래키 추가 성공 확인

### Phase 6: 코드 수정 ☐
- ☐ 환경 변수 업데이트
- ☐ Dual DB 파일 9개 수정 (최우선)
- ☐ Neon 단독 파일 70개 수정
- ☐ PlanetScale 단독 파일 324개 수정
- ☐ package.json에 mysql2 추가

### Phase 7: 로컬 테스트 ☐
- ☐ 로컬 개발 서버 정상 실행
- ☐ 인증 테스트 (로그인/프로필)
- ☐ 상품 조회 테스트
- ☐ 장바구니 테스트
- ☐ 주문/결제 테스트
- ☐ 외래키 제약조건 테스트

### Phase 8: Production 배포 ☐
- ☐ Vercel 환경 변수 업데이트
- ☐ Git commit & push
- ☐ Vercel 배포 완료
- ☐ Production 기능 테스트

### Phase 9: 모니터링 ☐
- ☐ DB 연결 모니터링 스크립트 실행
- ☐ Vercel 로그 모니터링
- ☐ 에러 발생 시 즉시 롤백 준비

---

## ⏱️ 예상 타임라인

| 시간 | Phase | 작업 내용 | 소요 시간 |
|------|-------|-----------|-----------|
| 01:30 | 준비 | 최종 확인, 체크리스트 점검 | 30분 |
| 02:00 | Phase 1 | 데이터 백업 (PlanetScale + Neon) | 30분 |
| 02:30 | Phase 2 | 고아 레코드 정리 | 15분 |
| 02:45 | Phase 3 | 새 DB 스키마 생성 | 10분 |
| 02:55 | Phase 4 | 데이터 이전 (users + 전체 테이블) | 45분 |
| 03:40 | Phase 5 | 외래키 제약조건 추가 | 10분 |
| 03:50 | Phase 6 | 애플리케이션 코드 수정 | 40분 |
| 04:30 | Phase 7 | 로컬 테스트 | 30분 |
| 05:00 | Phase 8 | Vercel 배포 및 테스트 | 20분 |
| 05:20 | Phase 9 | 모니터링 설정 | 10분 |
| **05:30** | **완료** | **마이그레이션 완료** | **총 4시간** |

---

## 🎯 마이그레이션 후 장점

### 1. 데이터 무결성 보장
- ✅ 외래키 제약조건으로 고아 레코드 완전 방지
- ✅ CASCADE로 관련 데이터 자동 정리
- ✅ 데이터베이스 레벨에서 참조 무결성 검증

### 2. 코드 단순화
- ✅ Dual DB → 단일 DB로 복잡도 감소
- ✅ 트랜잭션 사용 가능 (원자성 보장)
- ✅ 조인 쿼리 최적화 가능

### 3. 운영 효율성
- ✅ 단일 DB 모니터링으로 관리 간소화
- ✅ 백업/복구 프로세스 단순화
- ✅ 연결 풀 최적화 가능

### 4. 성능 개선
- ✅ 네트워크 레이턴시 감소 (DB 통신 횟수 감소)
- ✅ 조인 쿼리 성능 향상
- ✅ 트랜잭션 커밋 시간 단축

---

## 📞 문제 발생 시 대응

### 1. DB 연결 실패
```bash
# 원인 확인
mysql -h $NEW_DB_HOST -u $NEW_DB_USER -p

# 방화벽 확인
# Vercel IP 범위: https://vercel.com/docs/concepts/edge-network/regions

# 환경 변수 확인
vercel env ls
```

### 2. 외래키 추가 실패
```sql
-- 실패 원인 확인
SHOW ERRORS;

-- 고아 레코드 재확인
SELECT COUNT(*) FROM bookings WHERE user_id NOT IN (SELECT id FROM users);

-- 고아 레코드 삭제 후 재시도
DELETE FROM bookings WHERE user_id NOT IN (SELECT id FROM users);
ALTER TABLE bookings ADD CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id);
```

### 3. Vercel 배포 실패
```bash
# 로그 확인
vercel logs

# 빌드 에러 확인
npm run build

# 환경 변수 재설정
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production
```

---

## ✅ 마이그레이션 완료 후 확인사항

1. ✅ 모든 API 엔드포인트 정상 작동
2. ✅ 결제 프로세스 정상 작동 (Toss Payments)
3. ✅ 포인트 시스템 정상 작동
4. ✅ 장바구니 기능 정상 작동
5. ✅ 주문/예약 기능 정상 작동
6. ✅ 관리자 기능 정상 작동
7. ✅ 외래키 제약조건 정상 작동
8. ✅ 에러 로그 없음
9. ✅ 응답 속도 정상 (500ms 이내)
10. ✅ DB 연결 안정적 (에러율 0%)

---

## 📚 참고 자료

### PlanetScale 문서
- [PlanetScale Limitations](https://planetscale.com/docs/concepts/what-is-planetscale#what-planetscale-doesnt-support)
- [Foreign Keys on Vitess](https://vitess.io/docs/reference/features/foreign-keys/)

### mysql2 문서
- [mysql2 GitHub](https://github.com/sidorares/node-mysql2)
- [Connection Management](https://github.com/sidorares/node-mysql2#using-connection-pools)

### 네이버 Cloud DB
- [Cloud DB for MySQL](https://www.ncloud.com/product/database/cloudDbMysql)

### Google Cloud SQL
- [Cloud SQL for MySQL](https://cloud.google.com/sql/docs/mysql)

---

**마이그레이션 문서 작성 완료: 2025-11-05**
**예상 소요 시간: 4시간 (새벽 02:00 ~ 06:00)**
**예상 다운타임: 0분 (Blue-Green 배포 가능)**

---

끝.
