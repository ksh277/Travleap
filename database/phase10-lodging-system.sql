-- Phase 10: 숙박(Accommodation) 시스템
-- 호텔, 펜션, 모텔, 캠핑장 등 숙박업체 관리

-- 1. 숙박업체 기본 정보 (렌트카의 rentcar_vendors 재사용, 추가 테이블)
CREATE TABLE IF NOT EXISTS lodgings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL,
  listing_id INT,  -- listings 테이블 통합 (검색용)

  -- 기본 정보
  name VARCHAR(200) NOT NULL,
  type ENUM('hotel', 'motel', 'pension', 'guesthouse', 'camping', 'resort', 'hostel') NOT NULL,
  description TEXT,

  -- 위치
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',

  -- 연락처
  phone VARCHAR(50),
  email VARCHAR(200),
  website VARCHAR(500),

  -- 운영 정보
  star_rating TINYINT DEFAULT 0,  -- 0-5
  checkin_time TIME DEFAULT '15:00:00',
  checkout_time TIME DEFAULT '11:00:00',

  -- 이미지
  thumbnail_url VARCHAR(500),
  images JSON,  -- ["url1", "url2", ...]

  -- 편의시설 (JSON)
  amenities JSON,  -- {"wifi": true, "parking": true, "pool": false, ...}

  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor (vendor_id),
  INDEX idx_listing (listing_id),
  INDEX idx_type (type),
  INDEX idx_city (city),
  INDEX idx_location (latitude, longitude),
  INDEX idx_active (is_active, is_verified),

  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL
);

-- 2. 객실 타입 마스터
CREATE TABLE IF NOT EXISTS rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lodging_id INT NOT NULL,

  -- 객실 정보
  name VARCHAR(200) NOT NULL,  -- '디럭스 더블', '스탠다드 트윈'
  type ENUM('single', 'double', 'twin', 'suite', 'family', 'dormitory', 'camping_site') NOT NULL,
  description TEXT,

  -- 객실 스펙
  capacity INT NOT NULL,  -- 기준 인원
  max_capacity INT NOT NULL,  -- 최대 인원
  bed_type ENUM('single', 'double', 'queen', 'king', 'bunk', 'futon') DEFAULT 'double',
  bed_count INT DEFAULT 1,
  size_sqm DECIMAL(6, 2),  -- 평수
  floor INT,

  -- 이미지
  thumbnail_url VARCHAR(500),
  images JSON,  -- ["url1", "url2", ...]

  -- 객실 편의시설
  amenities JSON,  -- {"tv": true, "aircon": true, "kitchen": false, ...}

  -- 재고 설정
  total_rooms INT NOT NULL DEFAULT 1,  -- 이 타입의 총 객실 수

  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_lodging (lodging_id),
  INDEX idx_type (type),
  INDEX idx_active (is_active),
  INDEX idx_display (display_order),

  FOREIGN KEY (lodging_id) REFERENCES lodgings(id) ON DELETE CASCADE
);

-- 3. 요금 정책 (Rate Plans)
CREATE TABLE IF NOT EXISTS rate_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,

  -- 요금제 정보
  name VARCHAR(200) NOT NULL,  -- '조식 포함', '얼리버드'
  description TEXT,

  -- 기본 요금
  currency VARCHAR(3) DEFAULT 'KRW',
  base_price_per_night INT NOT NULL,

  -- 요금 조정 (백분율)
  weekend_markup_pct DECIMAL(5,2) DEFAULT 0,  -- 주말 할증
  peak_season_markup_pct DECIMAL(5,2) DEFAULT 0,  -- 성수기 할증
  long_stay_discount_pct DECIMAL(5,2) DEFAULT 0,  -- 장기 숙박 할인

  -- 추가 비용
  extra_person_fee INT DEFAULT 0,  -- 인원 초과 시
  breakfast_included BOOLEAN DEFAULT FALSE,
  breakfast_price INT DEFAULT 0,  -- 조식 미포함 시

  -- 세금 규칙
  tax_rules JSON,  -- {"vat_rate": 0.10, "city_tax_rate": 0.01, "service_charge_rate": 0.10}

  -- 숙박 제한
  min_stay_nights INT DEFAULT 1,
  max_stay_nights INT DEFAULT 365,

  -- 취소 정책
  cancel_policy_code VARCHAR(50) DEFAULT 'moderate',  -- 'flexible', 'moderate', 'strict', 'non_refundable'

  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_room (room_id),
  INDEX idx_active (is_active),
  INDEX idx_valid (valid_from, valid_until),

  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- 4. 일별 재고 및 요금 (렌트카의 availability 패턴)
CREATE TABLE IF NOT EXISTS availability_daily (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  date DATE NOT NULL,  -- 체크인 날짜

  -- 재고
  available_rooms INT NOT NULL DEFAULT 0,
  sold_rooms INT NOT NULL DEFAULT 0,
  blocked_rooms INT NOT NULL DEFAULT 0,  -- 정비 등

  -- 동적 요금 (비어있으면 rate_plan 기본가 사용)
  price_per_night INT,

  -- 제한
  min_stay INT,
  max_stay INT,
  closed_to_arrival BOOLEAN DEFAULT FALSE,  -- 체크인 불가
  closed_to_departure BOOLEAN DEFAULT FALSE,  -- 체크아웃 불가

  -- PMS 연동
  last_synced_at TIMESTAMP,
  external_reference VARCHAR(200),  -- PMS 재고 ID

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_room_date (room_id, date),
  INDEX idx_date (date),
  INDEX idx_available (available_rooms),

  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- 5. 숙박 예약
CREATE TABLE IF NOT EXISTS lodging_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  lodging_id INT NOT NULL,  -- 조회 편의성
  user_id INT,

  -- 투숙 정보
  guest_name VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(50) NOT NULL,
  guest_email VARCHAR(200),
  guest_count INT NOT NULL,

  -- 날짜
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  nights INT NOT NULL,

  -- 가격 상세
  room_price INT NOT NULL,  -- 객실 요금
  extra_person_fee INT DEFAULT 0,
  breakfast_fee INT DEFAULT 0,
  tax_amount INT DEFAULT 0,
  service_charge INT DEFAULT 0,
  total_price INT NOT NULL,

  -- 예약 상태
  status ENUM('HOLD', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW') DEFAULT 'HOLD',
  hold_expires_at TIMESTAMP,  -- 10분 TTL

  -- 결제
  payment_status ENUM('pending', 'authorized', 'captured', 'refunded') DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_key VARCHAR(200),  -- 토스페이먼츠

  -- 취소
  cancel_policy_code VARCHAR(50),
  cancelled_at TIMESTAMP,
  cancel_reason TEXT,
  refund_amount INT DEFAULT 0,

  -- PMS 연동
  external_reference VARCHAR(200),  -- PMS 예약 번호
  pms_provider VARCHAR(50),  -- 'yanolja', 'goodchoice', 'naver'

  -- 특이사항
  special_requests TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_room (room_id),
  INDEX idx_lodging (lodging_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_checkin (checkin_date),
  INDEX idx_created (created_at),
  INDEX idx_hold_expires (hold_expires_at),

  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (lodging_id) REFERENCES lodgings(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. 정책 관리 (다국어)
CREATE TABLE IF NOT EXISTS lodging_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lodging_id INT NOT NULL,
  type ENUM('cancellation', 'house_rule', 'refund', 'child', 'pet') NOT NULL,

  -- 다국어 콘텐츠
  title_ko VARCHAR(500),
  content_ko TEXT,
  title_en VARCHAR(500),
  content_en TEXT,
  title_ja VARCHAR(500),
  content_ja TEXT,

  -- 취소 정책 (type = 'cancellation')
  policy_code VARCHAR(50),  -- 'flexible', 'moderate', 'strict'
  free_cancel_hours INT,  -- 체크인 X시간 전까지 무료
  partial_refund_hours INT,
  refund_percentage DECIMAL(5,2),

  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_lodging (lodging_id),
  INDEX idx_type (type),
  INDEX idx_policy_code (policy_code),

  FOREIGN KEY (lodging_id) REFERENCES lodgings(id) ON DELETE CASCADE
);

-- 7. PMS API 연동 정보
CREATE TABLE IF NOT EXISTS pms_api_credentials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL,
  provider ENUM('yanolja', 'goodchoice', 'naver', 'booking_com', 'agoda', 'expedia') NOT NULL,

  -- 인증 정보 (암호화 필수)
  api_key VARCHAR(500),  -- KMS 암호화
  api_secret VARCHAR(500),  -- KMS 암호화
  endpoint_url VARCHAR(500),

  -- 동기화 설정
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_interval_minutes INT DEFAULT 5,
  last_synced_at TIMESTAMP,
  last_sync_status ENUM('success', 'failed', 'partial') DEFAULT 'success',

  -- Rate Limit
  rate_limit_policy JSON,  -- {"requests_per_minute": 60, "burst_size": 10}

  -- 필드 매핑
  field_mapping JSON,  -- {"room_id_field": "room_code", "rate_plan_field": "rate_code", ...}

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor (vendor_id),
  INDEX idx_provider (provider),
  INDEX idx_sync (sync_enabled, last_synced_at),

  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE
);

-- 8. PMS 동기화 작업 로그
CREATE TABLE IF NOT EXISTS pms_sync_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL,
  pms_provider VARCHAR(50) NOT NULL,

  sync_type ENUM('inventory', 'rates', 'bookings', 'content') NOT NULL,
  status ENUM('pending', 'running', 'success', 'failed') DEFAULT 'pending',

  -- 통계
  records_processed INT DEFAULT 0,
  records_failed INT DEFAULT 0,

  -- 에러
  error_message TEXT,
  error_stack TEXT,

  -- 타이밍
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_vendor (vendor_id),
  INDEX idx_provider (pms_provider),
  INDEX idx_status (status),
  INDEX idx_created (created_at),

  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE
);

-- 9. 재고 잠금 (렌트카 패턴)
CREATE TABLE IF NOT EXISTS lodging_inventory_locks (
  lock_id VARCHAR(64) PRIMARY KEY,  -- UUID
  room_id INT NOT NULL,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,

  rooms_locked INT NOT NULL DEFAULT 1,
  booking_id INT,  -- HOLD 단계에서는 NULL

  status ENUM('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED') DEFAULT 'ACTIVE',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,  -- 10분 TTL
  committed_at TIMESTAMP,

  INDEX idx_room (room_id),
  INDEX idx_dates (checkin_date, checkout_date),
  INDEX idx_status (status),
  INDEX idx_expires (expires_at),

  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES lodging_bookings(id) ON DELETE CASCADE
);

-- 10. 기본 데이터 삽입 (테스트용)
-- 예시 숙소 1개 (vendor_id = 1 가정)
INSERT INTO lodgings (vendor_id, name, type, description, address, city, district, latitude, longitude, phone, email, star_rating, thumbnail_url, images, amenities, is_active, is_verified)
VALUES (
  1,
  '신안 비치 리조트',
  'resort',
  '신안군 최고의 오션뷰 리조트입니다. 모든 객실에서 바다를 감상하실 수 있습니다.',
  '전라남도 신안군 도초면 해안로 123',
  '신안군',
  '도초면',
  34.7324,
  126.2155,
  '061-1234-5678',
  'shinan.resort@example.com',
  4,
  'https://example.com/resort-thumb.jpg',
  '["https://example.com/resort1.jpg", "https://example.com/resort2.jpg"]',
  '{"wifi": true, "parking": true, "pool": true, "gym": false, "restaurant": true, "breakfast": true, "pet_friendly": false, "smoking_allowed": false}',
  TRUE,
  TRUE
);

-- 예시 객실 2개
INSERT INTO rooms (lodging_id, name, type, description, capacity, max_capacity, bed_type, bed_count, size_sqm, thumbnail_url, images, amenities, total_rooms, is_active)
VALUES
(1, '디럭스 오션뷰', 'double', '발코니가 있는 넓은 오션뷰 객실입니다.', 2, 3, 'queen', 1, 33.5, 'https://example.com/deluxe-thumb.jpg', '["https://example.com/deluxe1.jpg"]', '{"tv": true, "aircon": true, "refrigerator": true, "kitchen": false, "bath_tub": true, "shower": true, "balcony": true, "ocean_view": true}', 10, TRUE),
(1, '스탠다드 트윈', 'twin', '편안한 스탠다드 트윈룸입니다.', 2, 2, 'single', 2, 25.0, 'https://example.com/standard-thumb.jpg', '["https://example.com/standard1.jpg"]', '{"tv": true, "aircon": true, "refrigerator": false, "kitchen": false, "bath_tub": false, "shower": true, "balcony": false, "ocean_view": false}', 15, TRUE);

-- 예시 요금제
INSERT INTO rate_plans (room_id, name, description, base_price_per_night, weekend_markup_pct, peak_season_markup_pct, long_stay_discount_pct, extra_person_fee, breakfast_included, breakfast_price, tax_rules, min_stay_nights, max_stay_nights, cancel_policy_code, is_active)
VALUES
(1, '조식 포함', '조식이 포함된 요금제입니다.', 150000, 40.00, 30.00, 10.00, 20000, TRUE, 0, '{"vat_rate": 0.10, "city_tax_rate": 0.01, "service_charge_rate": 0.10}', 1, 30, 'moderate', TRUE),
(2, '기본 요금', '기본 요금제입니다.', 100000, 40.00, 30.00, 10.00, 15000, FALSE, 15000, '{"vat_rate": 0.10, "city_tax_rate": 0.01, "service_charge_rate": 0.10}', 1, 30, 'flexible', TRUE);

-- 예시 재고 생성 (앞으로 30일)
INSERT INTO availability_daily (room_id, date, available_rooms, sold_rooms, blocked_rooms)
SELECT
  r.id,
  DATE_ADD(CURDATE(), INTERVAL seq DAY),
  r.total_rooms,
  0,
  0
FROM rooms r
CROSS JOIN (
  SELECT 0 AS seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL
  SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL
  SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
) AS nums
WHERE r.lodging_id = 1;

-- 기본 취소 정책
INSERT INTO lodging_policies (lodging_id, type, title_ko, content_ko, policy_code, free_cancel_hours, partial_refund_hours, refund_percentage, is_active)
VALUES
(1, 'cancellation', '유연한 취소', '체크인 24시간 전까지 무료 취소 가능합니다.', 'flexible', 24, 0, 100, TRUE),
(1, 'house_rule', '하우스 룰', '- 금연\n- 반려동물 불가\n- 정숙 시간: 22:00 - 08:00', NULL, NULL, NULL, NULL, TRUE);

-- 완료 메시지
SELECT 'Phase 10: 숙박 시스템 테이블 생성 완료!' AS status;
SELECT '생성된 테이블: lodgings, rooms, rate_plans, availability_daily, lodging_bookings, lodging_policies, pms_api_credentials, pms_sync_jobs, lodging_inventory_locks' AS tables;
