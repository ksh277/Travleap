-- 렌트카 요금 정책 테이블
CREATE TABLE IF NOT EXISTS rentcar_pricing_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL,
  policy_type ENUM('duration_discount', 'day_of_week', 'season', 'early_bird') NOT NULL,

  -- 기간별 할인 (duration_discount)
  min_days INT,
  max_days INT,
  discount_percentage DECIMAL(5,2),

  -- 요일별 요금 (day_of_week)
  day_of_week VARCHAR(20),
  price_multiplier DECIMAL(5,2),

  -- 시즌별 요금 (season)
  season_name VARCHAR(100),
  start_date DATE,
  end_date DATE,
  season_multiplier DECIMAL(5,2),

  -- 얼리버드 할인 (early_bird)
  days_before_pickup INT,
  early_bird_discount DECIMAL(5,2),

  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor_active (vendor_id, is_active),
  INDEX idx_policy_type (vendor_id, policy_type, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 렌트카 보험 상품 테이블
CREATE TABLE IF NOT EXISTS rentcar_insurance_products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL,
  insurance_name VARCHAR(100) NOT NULL,
  insurance_type ENUM('basic', 'cdw', 'super_cdw', 'full_coverage') NOT NULL,
  description TEXT,
  coverage_limit BIGINT,
  deductible INT,
  daily_price INT NOT NULL,
  is_included TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor_active (vendor_id, is_active),
  INDEX idx_display_order (vendor_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 렌트카 추가 옵션 테이블
CREATE TABLE IF NOT EXISTS rentcar_additional_options (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL,
  option_name VARCHAR(100) NOT NULL,
  option_type ENUM('navigation', 'child_seat', 'wifi', 'snow_tire', 'ski_rack', 'other') NOT NULL,
  description TEXT,
  daily_price INT NOT NULL,
  one_time_price INT DEFAULT 0,
  quantity_available INT DEFAULT 999,
  is_active TINYINT(1) DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor_active (vendor_id, is_active),
  INDEX idx_display_order (vendor_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
