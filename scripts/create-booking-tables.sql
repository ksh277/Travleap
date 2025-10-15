-- 예약 시스템 필수 테이블 생성 스크립트
-- PlanetScale (MySQL) 호환

-- 1. payment_events 테이블 (웹훅 이벤트 기록)
CREATE TABLE IF NOT EXISTS payment_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(50) NOT NULL,
  booking_id INT,
  payment_key VARCHAR(255),
  amount DECIMAL(15, 2),
  raw_payload TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking_id (booking_id),
  INDEX idx_payment_key (payment_key),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. booking_logs 테이블 (예약 변경 이력)
CREATE TABLE IF NOT EXISTS booking_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking_id (booking_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. bookings 테이블 확장 (필수 컬럼 추가)
-- 기존 테이블에 없는 컬럼만 추가
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMP NULL AFTER payment_status,
ADD COLUMN IF NOT EXISTS deposit_auth_id VARCHAR(255) NULL AFTER hold_expires_at,
ADD COLUMN IF NOT EXISTS deposit_preauth_at TIMESTAMP NULL AFTER deposit_auth_id,
ADD COLUMN IF NOT EXISTS payment_key VARCHAR(255) NULL AFTER deposit_preauth_at,
ADD COLUMN IF NOT EXISTS payment_approved_at TIMESTAMP NULL AFTER payment_key,
ADD COLUMN IF NOT EXISTS customer_info JSON NULL AFTER payment_approved_at;

-- 인덱스 추가
ALTER TABLE bookings ADD INDEX IF NOT EXISTS idx_status_hold_expires (status, hold_expires_at);
ALTER TABLE bookings ADD INDEX IF NOT EXISTS idx_payment_status (payment_status);
ALTER TABLE bookings ADD INDEX IF NOT EXISTS idx_deposit_auth (deposit_auth_id);

-- 4. vendor_settings 테이블 (벤더별 설정)
CREATE TABLE IF NOT EXISTS vendor_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  deposit_amount DECIMAL(10, 2) DEFAULT 50000,
  preauth_offset_minutes INT DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_listing_id (listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 완료 메시지
SELECT 'Booking system tables created successfully!' AS status;
