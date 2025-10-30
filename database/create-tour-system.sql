-- ================================================================
-- 여행(투어) 시스템 데이터베이스 스키마
-- Phase 3: 투어 패키지 예약, 일정 관리, QR 바우처 발급
-- ================================================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
