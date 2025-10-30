-- ================================================================
-- 음식 시스템 데이터베이스 스키마
-- Phase 4: 식당 메뉴 관리, 예약/포장/매장 주문, 테이블 QR 주문
-- ================================================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
