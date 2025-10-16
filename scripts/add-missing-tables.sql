-- 누락된 테이블 추가 스크립트

-- 1. home_banners 테이블 (홈 페이지 배너)
CREATE TABLE IF NOT EXISTS home_banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  title VARCHAR(200),
  link_url VARCHAR(500),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_order (display_order)
);

-- 2. activity_images 테이블 (활동 이미지)
CREATE TABLE IF NOT EXISTS activity_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  title VARCHAR(200),
  link_url VARCHAR(500),
  size ENUM('small', 'medium', 'large', 'full') DEFAULT 'medium',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_order (display_order),
  INDEX idx_size (size)
);

-- 3. lodging_bookings 테이블 (숙박 예약)
CREATE TABLE IF NOT EXISTS lodging_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  room_id INT NOT NULL,
  lodging_id INT NOT NULL,
  user_id INT NOT NULL,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  num_guests INT DEFAULT 1,
  num_rooms INT DEFAULT 1,
  rooms_booked INT DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'in_progress') DEFAULT 'pending',
  hold_expires_at TIMESTAMP,
  customer_info JSON,
  special_requests TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_room (room_id),
  INDEX idx_lodging (lodging_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_dates (checkin_date, checkout_date),
  INDEX idx_hold_expires (hold_expires_at)
);

-- 4. vendor_settings 테이블 (벤더 설정)
CREATE TABLE IF NOT EXISTS vendor_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT UNIQUE NOT NULL,
  listing_id INT,
  deposit_amount DECIMAL(10, 2) DEFAULT 100000 COMMENT '보증금 금액',
  auto_confirm BOOLEAN DEFAULT FALSE COMMENT '자동 예약 확정',
  business_hours JSON COMMENT '영업 시간',
  cancellation_policy TEXT COMMENT '취소 정책',
  special_instructions TEXT COMMENT '특별 안내사항',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendor (vendor_id),
  INDEX idx_listing (listing_id)
);

-- 5. pms_api_credentials 테이블 (PMS API 인증 정보)
CREATE TABLE IF NOT EXISTS pms_api_credentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  pms_provider ENUM('ezee', 'cloudbeds', 'opera', 'mews', 'rms_cloud', 'stayntouch', 'custom') NOT NULL,
  api_key VARCHAR(500),
  api_secret VARCHAR(500),
  api_endpoint VARCHAR(500),
  hotel_id VARCHAR(100),
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_interval_hours INT DEFAULT 1,
  last_sync_at TIMESTAMP,
  last_sync_status ENUM('success', 'failed', 'partial') DEFAULT 'success',
  last_sync_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendor (vendor_id),
  INDEX idx_provider (pms_provider),
  INDEX idx_sync_enabled (sync_enabled),
  INDEX idx_last_sync (last_sync_at)
);

-- 6. commission_rates 테이블 (수수료율 관리) **NEW**
CREATE TABLE IF NOT EXISTS commission_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) COMMENT '카테고리 (null이면 전체 기본값)',
  vendor_id INT COMMENT '벤더 ID (null이면 카테고리 기본값)',
  rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00 COMMENT '플랫폼 수수료율 (%)',
  effective_from TIMESTAMP COMMENT '적용 시작일',
  effective_to TIMESTAMP COMMENT '적용 종료일',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT COMMENT '비고',
  created_by INT COMMENT '생성한 관리자 ID',
  updated_by INT COMMENT '수정한 관리자 ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_vendor (vendor_id),
  INDEX idx_active (is_active),
  INDEX idx_effective (effective_from, effective_to)
);

-- 기본 수수료율 데이터 삽입 (존재하지 않을 경우만)
INSERT IGNORE INTO commission_rates (id, category, vendor_id, rate, is_active, notes, created_by)
VALUES
  (1, NULL, NULL, 10.00, TRUE, '전체 기본 수수료율', 1),
  (2, 'rentcar', NULL, 10.00, TRUE, '렌트카 기본 수수료율', 1),
  (3, 'stay', NULL, 12.00, TRUE, '숙박 기본 수수료율', 1),
  (4, 'tour', NULL, 15.00, TRUE, '여행 기본 수수료율', 1);
