-- ========================================
-- 누락된 테이블 생성 스크립트
-- PlanetScale (MySQL 8.0 호환)
-- ========================================

-- 1. home_banners 테이블
CREATE TABLE IF NOT EXISTS `home_banners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `image_url` VARCHAR(500) NOT NULL COMMENT '배너 이미지 URL',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '배너 제목',
  `link_url` VARCHAR(500) DEFAULT NULL COMMENT '클릭 시 이동할 URL',
  `display_order` INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '활성화 여부',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_display_order` (`display_order`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='홈페이지 배너 관리';

-- 2. activity_images 테이블
CREATE TABLE IF NOT EXISTS activity_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  title VARCHAR(255) NOT NULL,
  link_url VARCHAR(500),
  size ENUM('large', 'small') NOT NULL DEFAULT 'small',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. vendor_settings 테이블
CREATE TABLE IF NOT EXISTS vendor_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  deposit_amount DECIMAL(10, 2) DEFAULT 50000,
  preauth_offset_minutes INT DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_listing_id (listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. payment_events 테이블
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

-- 5. booking_logs 테이블
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

-- 완료 메시지
SELECT 'All missing tables created successfully!' AS status;
