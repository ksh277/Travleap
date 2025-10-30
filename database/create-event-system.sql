-- ================================================================
-- 행사 시스템 데이터베이스 스키마
-- Phase 6: 좌석 선택, 전자 티켓 발급, QR 입장 게이트 시스템
-- ================================================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
