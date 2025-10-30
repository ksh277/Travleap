-- ================================================================
-- 체험 시스템 데이터베이스 스키마
-- Phase 5: 체험 프로그램 슬롯 예약, 전자 면책동의서, 기상 API 연동
-- ================================================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
