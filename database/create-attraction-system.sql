-- ================================================================
-- 관광지 시스템 데이터베이스 스키마
-- Phase 7: 입장권 구매, 게이트 QR 검증
-- ================================================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
