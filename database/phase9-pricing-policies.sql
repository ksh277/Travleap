-- Phase 9: 요금 정책, 보험, 추가 옵션 시스템
-- 업체별 요금 정책 및 상품 관리

-- 1. 업체별 요금 정책 테이블
CREATE TABLE IF NOT EXISTS rentcar_pricing_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL,
  policy_type ENUM('duration_discount', 'day_of_week', 'season', 'early_bird') NOT NULL,

  -- 기간별 할인 (duration_discount)
  min_days INT,
  max_days INT,
  discount_percentage DECIMAL(5,2),

  -- 요일별 요금 (day_of_week)
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
  price_multiplier DECIMAL(5,2), -- 1.0 = 정상가, 1.4 = +40%, 0.8 = -20%

  -- 시즌별 요금 (season)
  season_name VARCHAR(50), -- '성수기', '비수기', '크리스마스' 등
  start_date DATE,
  end_date DATE,
  season_multiplier DECIMAL(5,2),

  -- 얼리버드 할인 (early_bird)
  days_before_pickup INT, -- 예약을 며칠 전에 해야 할인 적용
  early_bird_discount DECIMAL(5,2),

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor (vendor_id),
  INDEX idx_policy_type (policy_type),
  INDEX idx_season (start_date, end_date),
  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE
);

-- 2. 보험 상품 테이블
CREATE TABLE IF NOT EXISTS rentcar_insurance_products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL,
  insurance_name VARCHAR(100) NOT NULL, -- '기본 보험', 'CDW', '완전자차' 등
  insurance_type ENUM('basic', 'cdw', 'super_cdw', 'full_coverage') NOT NULL,
  description TEXT,
  coverage_limit BIGINT, -- 보상 한도 (원)
  deductible BIGINT, -- 자기부담금 (원)
  daily_price INT NOT NULL, -- 일일 가격 (원)
  is_included BOOLEAN DEFAULT FALSE, -- 기본 포함 여부
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor (vendor_id),
  INDEX idx_type (insurance_type),
  INDEX idx_active (is_active, display_order),
  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE
);

-- 3. 추가 옵션 상품 테이블
CREATE TABLE IF NOT EXISTS rentcar_additional_options (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL,
  option_name VARCHAR(100) NOT NULL, -- '네비게이션', '아동 카시트', '와이파이' 등
  option_type ENUM('navigation', 'child_seat', 'wifi', 'snow_tire', 'ski_rack', 'other') NOT NULL,
  description TEXT,
  daily_price INT NOT NULL, -- 일일 가격 (원)
  one_time_price INT, -- 1회 가격 (설치비 등)
  quantity_available INT DEFAULT 999, -- 이용 가능 수량
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor (vendor_id),
  INDEX idx_type (option_type),
  INDEX idx_active (is_active, display_order),
  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE
);

-- 4. 예약별 보험 선택 테이블
CREATE TABLE IF NOT EXISTS rentcar_booking_insurance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  insurance_id INT NOT NULL,
  days INT NOT NULL,
  unit_price INT NOT NULL,
  total_price INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_booking (booking_id),
  FOREIGN KEY (booking_id) REFERENCES rentcar_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (insurance_id) REFERENCES rentcar_insurance_products(id)
);

-- 5. 예약별 추가 옵션 선택 테이블
CREATE TABLE IF NOT EXISTS rentcar_booking_options (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  option_id INT NOT NULL,
  quantity INT DEFAULT 1,
  days INT NOT NULL,
  unit_price INT NOT NULL,
  one_time_price INT DEFAULT 0,
  total_price INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_booking (booking_id),
  FOREIGN KEY (booking_id) REFERENCES rentcar_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES rentcar_additional_options(id)
);

-- 6. 예약 테이블에 컬럼 추가 (가격 분리)
ALTER TABLE rentcar_bookings
ADD COLUMN IF NOT EXISTS base_price INT COMMENT '기본 차량 대여료',
ADD COLUMN IF NOT EXISTS discount_amount INT DEFAULT 0 COMMENT '할인 금액',
ADD COLUMN IF NOT EXISTS insurance_price INT DEFAULT 0 COMMENT '보험 총액',
ADD COLUMN IF NOT EXISTS options_price INT DEFAULT 0 COMMENT '추가 옵션 총액',
ADD COLUMN IF NOT EXISTS final_price INT COMMENT '최종 결제 금액';

-- 기존 데이터 마이그레이션 (total_price → base_price, final_price)
UPDATE rentcar_bookings
SET base_price = total_price,
    final_price = total_price
WHERE base_price IS NULL;

-- 7. 기본 보험 상품 데이터 (예시)
-- 관리자가 나중에 업체별로 추가 가능
INSERT INTO rentcar_insurance_products (vendor_id, insurance_name, insurance_type, description, coverage_limit, deductible, daily_price, is_included, display_order)
VALUES
(1, '기본 보험', 'basic', '대인/대물 배상 책임 보험 (의무)', 100000000, 1000000, 0, TRUE, 1),
(1, 'CDW 자차손해면책', 'cdw', '자차 파손 시 자기부담금 면제', 50000000, 500000, 10000, FALSE, 2),
(1, '완전자차', 'super_cdw', '모든 자차 손해 면제 (자기부담금 0원)', 100000000, 0, 20000, FALSE, 3),
(1, '풀커버리지', 'full_coverage', '대인/대물/자차 모두 포함 + 도난/침수', 200000000, 0, 30000, FALSE, 4);

-- 8. 기본 추가 옵션 데이터 (예시)
INSERT INTO rentcar_additional_options (vendor_id, option_name, option_type, description, daily_price, one_time_price, display_order)
VALUES
(1, '네비게이션', 'navigation', 'GPS 네비게이션 기기 제공', 5000, 0, 1),
(1, '아동 카시트', 'child_seat', '유아용 카시트 (5세 미만)', 10000, 5000, 2),
(1, '와이파이', 'wifi', '차량용 무선 인터넷 (LTE 무제한)', 5000, 0, 3),
(1, '스노우 타이어', 'snow_tire', '겨울철 스노우 체인 + 타이어', 15000, 20000, 4),
(1, '스키/보드 거치대', 'ski_rack', '루프 스키 거치대', 8000, 10000, 5);

-- 9. 기본 요금 정책 데이터 (예시)
INSERT INTO rentcar_pricing_policies (vendor_id, policy_type, min_days, max_days, discount_percentage)
VALUES
(1, 'duration_discount', 3, 6, 10.00),
(1, 'duration_discount', 7, 29, 20.00),
(1, 'duration_discount', 30, 999, 30.00);

INSERT INTO rentcar_pricing_policies (vendor_id, policy_type, day_of_week, price_multiplier)
VALUES
(1, 'day_of_week', 'friday', 1.40),
(1, 'day_of_week', 'saturday', 1.40),
(1, 'day_of_week', 'sunday', 1.40);

INSERT INTO rentcar_pricing_policies (vendor_id, policy_type, season_name, start_date, end_date, season_multiplier)
VALUES
(1, 'season', '여름 성수기', '2025-07-01', '2025-08-31', 1.30),
(1, 'season', '겨울 비수기', '2025-01-01', '2025-02-28', 0.80);

-- 10. 인덱스 최적화
CREATE INDEX idx_booking_prices ON rentcar_bookings(final_price, created_at);
CREATE INDEX idx_policy_active ON rentcar_pricing_policies(vendor_id, is_active);
CREATE INDEX idx_insurance_active ON rentcar_insurance_products(vendor_id, is_active);
CREATE INDEX idx_options_active ON rentcar_additional_options(vendor_id, is_active);

-- 완료 메시지
SELECT 'Phase 9: 요금 정책/보험/옵션 테이블 생성 완료!' AS status;
