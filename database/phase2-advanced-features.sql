-- =====================================================
-- Phase 2: Advanced Features for Rentcar System
-- =====================================================
-- 요금제, 보험, 부가옵션, 가용성 규칙 추가
-- PlanetScale 호환 (NO FOREIGN KEY)

-- =====================================================
-- 1. 요금제 (Rate Plans)
-- =====================================================
-- 시즌별, 기간별 차별화된 요금 관리
CREATE TABLE IF NOT EXISTS rentcar_rate_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    vehicle_id BIGINT NULL COMMENT '특정 차량에 대한 요금제 (NULL이면 차량 클래스별 적용)',
    vehicle_class VARCHAR(50) NULL COMMENT 'compact, midsize, fullsize, luxury, suv, van, electric',

    -- 요금제 정보
    plan_name VARCHAR(200) NOT NULL COMMENT '요금제명 (예: 성수기 주말 요금)',
    plan_code VARCHAR(100) NOT NULL COMMENT '요금제 코드',
    description TEXT COMMENT '요금제 설명',

    -- 적용 기간
    start_date DATE NOT NULL COMMENT '적용 시작일',
    end_date DATE NOT NULL COMMENT '적용 종료일',

    -- 요금 정보
    daily_rate_krw INT NOT NULL COMMENT '1일 요금',
    weekly_rate_krw INT NULL COMMENT '주간 요금 (7일 이상 할인)',
    monthly_rate_krw INT NULL COMMENT '월간 요금 (30일 이상 할인)',

    -- 최소/최대 렌탈 기간
    min_rental_days INT DEFAULT 1 COMMENT '최소 대여 일수',
    max_rental_days INT NULL COMMENT '최대 대여 일수',

    -- 요일별 할인/할증
    weekend_surcharge_percent DECIMAL(5,2) DEFAULT 0.00 COMMENT '주말 할증율 (%)',
    weekday_discount_percent DECIMAL(5,2) DEFAULT 0.00 COMMENT '평일 할인율 (%)',

    -- 조기예약 할인
    early_bird_days INT NULL COMMENT '조기예약 기준 일수',
    early_bird_discount_percent DECIMAL(5,2) DEFAULT 0.00 COMMENT '조기예약 할인율',

    -- 장기렌탈 할인
    long_term_days INT NULL COMMENT '장기렌탈 기준 일수',
    long_term_discount_percent DECIMAL(5,2) DEFAULT 0.00 COMMENT '장기렌탈 할인율',

    -- 우선순위 (높을수록 우선 적용)
    priority INT DEFAULT 0 COMMENT '우선순위 (1-100)',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,

    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vendor_vehicle (vendor_id, vehicle_id),
    INDEX idx_vendor_class (vendor_id, vehicle_class),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_active (is_active),
    UNIQUE KEY unique_plan_code (vendor_id, plan_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. 보험 상품 (Insurance Plans)
-- =====================================================
-- CDW, TP, PAI 등 다양한 보험 상품 관리
CREATE TABLE IF NOT EXISTS rentcar_insurance_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,

    -- 보험 정보
    insurance_code VARCHAR(50) NOT NULL COMMENT '보험 코드',
    insurance_name VARCHAR(200) NOT NULL COMMENT '보험명',
    insurance_type VARCHAR(50) NOT NULL COMMENT 'cdw, tp, pai, lli, etc',
    description TEXT COMMENT '보험 설명',

    -- 가격 정보
    daily_price_krw INT NOT NULL COMMENT '일일 보험료',
    max_coverage_krw BIGINT NULL COMMENT '최대 보상액',
    deductible_krw INT DEFAULT 0 COMMENT '자기부담금',

    -- 보험 조건
    min_driver_age INT DEFAULT 21 COMMENT '최소 운전자 나이',
    requires_license_years INT DEFAULT 1 COMMENT '필요 면허 취득 기간 (년)',

    -- 보험 혜택 (JSON)
    coverage_details JSON COMMENT '보장 상세 내역',
    exclusions JSON COMMENT '면책 사항',

    -- 추천 여부
    is_recommended BOOLEAN DEFAULT FALSE COMMENT '추천 보험',
    display_order INT DEFAULT 0 COMMENT '표시 순서',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,

    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vendor (vendor_id),
    INDEX idx_type (insurance_type),
    INDEX idx_active (is_active),
    UNIQUE KEY unique_insurance_code (vendor_id, insurance_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. 부가 옵션/서비스 (Extras)
-- =====================================================
-- GPS, 카시트, 와이파이, 픽업서비스 등 부가 옵션 관리
CREATE TABLE IF NOT EXISTS rentcar_extras (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,

    -- 옵션 정보
    extra_code VARCHAR(50) NOT NULL COMMENT '옵션 코드',
    extra_name VARCHAR(200) NOT NULL COMMENT '옵션명',
    extra_type VARCHAR(50) NOT NULL COMMENT 'gps, child_seat, wifi, additional_driver, pickup_service, etc',
    description TEXT COMMENT '옵션 설명',

    -- 가격 정보
    pricing_type ENUM('per_rental', 'per_day') DEFAULT 'per_day' COMMENT '요금 유형',
    price_krw INT NOT NULL COMMENT '가격',

    -- 수량 제한
    max_quantity INT DEFAULT 1 COMMENT '최대 수량',
    available_quantity INT NULL COMMENT '가용 수량 (NULL이면 무제한)',

    -- 필수 여부
    is_mandatory BOOLEAN DEFAULT FALSE COMMENT '필수 옵션 여부',
    is_prepaid BOOLEAN DEFAULT FALSE COMMENT '선불 필수 여부',

    -- 이미지 및 아이콘
    icon_url VARCHAR(500) COMMENT '아이콘 URL',
    image_url VARCHAR(500) COMMENT '이미지 URL',

    -- 표시 옵션
    display_order INT DEFAULT 0 COMMENT '표시 순서',
    badge_text VARCHAR(50) COMMENT '배지 텍스트 (예: 인기, 추천)',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,

    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vendor (vendor_id),
    INDEX idx_type (extra_type),
    INDEX idx_active (is_active),
    UNIQUE KEY unique_extra_code (vendor_id, extra_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. 가용성 규칙 (Availability Rules)
-- =====================================================
-- 특정 기간/요일의 렌탈 제한 규칙 관리
CREATE TABLE IF NOT EXISTS rentcar_availability_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    vehicle_id BIGINT NULL COMMENT '특정 차량에 대한 규칙 (NULL이면 전체 적용)',
    location_id BIGINT NULL COMMENT '특정 지점에 대한 규칙',

    -- 규칙 정보
    rule_name VARCHAR(200) NOT NULL COMMENT '규칙명',
    rule_type ENUM('blackout', 'minimum_stay', 'closed', 'restricted') DEFAULT 'blackout',
    description TEXT COMMENT '규칙 설명',

    -- 적용 기간
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- 요일 제한 (JSON 배열: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
    applicable_days JSON COMMENT '적용 요일',

    -- 시간 제한
    start_time TIME NULL COMMENT '시작 시간',
    end_time TIME NULL COMMENT '종료 시간',

    -- 최소 렌탈 일수 (minimum_stay 타입용)
    minimum_rental_days INT NULL COMMENT '최소 렌탈 일수',

    -- 우선순위
    priority INT DEFAULT 0,

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,

    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vendor_vehicle (vendor_id, vehicle_id),
    INDEX idx_vendor_location (vendor_id, location_id),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. 예약-부가옵션 연결 테이블 (Booking Extras)
-- =====================================================
-- 각 예약에 추가된 부가 옵션 추적
CREATE TABLE IF NOT EXISTS rentcar_booking_extras (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    extra_id BIGINT NOT NULL,

    -- 수량 및 가격
    quantity INT DEFAULT 1,
    unit_price_krw INT NOT NULL COMMENT '단가',
    total_price_krw INT NOT NULL COMMENT '총 가격',

    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_booking (booking_id),
    INDEX idx_extra (extra_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. 예약-보험 연결 테이블 (Booking Insurance)
-- =====================================================
-- 각 예약에 추가된 보험 추적
CREATE TABLE IF NOT EXISTS rentcar_booking_insurance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    insurance_id BIGINT NOT NULL,

    -- 가격 정보
    daily_price_krw INT NOT NULL,
    rental_days INT NOT NULL,
    total_price_krw INT NOT NULL,

    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_booking (booking_id),
    INDEX idx_insurance (insurance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 샘플 데이터 삽입
-- =====================================================

-- 요금제 샘플
INSERT INTO rentcar_rate_plans (
    vendor_id, vehicle_class, plan_name, plan_code, description,
    start_date, end_date, daily_rate_krw, weekly_rate_krw,
    weekend_surcharge_percent, priority, is_active
) VALUES
(1, 'compact', '비수기 기본 요금', 'LOW_SEASON_COMPACT', '11월-2월 비수기 소형차 기본 요금',
 '2024-11-01', '2025-02-28', 45000, 280000, 10.00, 1, TRUE),
(1, 'compact', '성수기 요금', 'HIGH_SEASON_COMPACT', '7월-8월 성수기 소형차 요금',
 '2025-07-01', '2025-08-31', 75000, 480000, 20.00, 2, TRUE),
(1, 'suv', '비수기 SUV 요금', 'LOW_SEASON_SUV', '비수기 SUV 기본 요금',
 '2024-11-01', '2025-02-28', 85000, 550000, 10.00, 1, TRUE),
(2, 'midsize', '신안렌트카 기본요금', 'SINAN_BASE_MIDSIZE', '중형차 연중 기본 요금',
 '2024-01-01', '2025-12-31', 55000, 350000, 15.00, 1, TRUE);

-- 보험 상품 샘플
INSERT INTO rentcar_insurance_plans (
    vendor_id, insurance_code, insurance_name, insurance_type, description,
    daily_price_krw, max_coverage_krw, deductible_krw,
    is_recommended, display_order, is_active
) VALUES
(1, 'CDW_BASIC', '기본 자차손해보험 (CDW)', 'cdw', '차량 손해에 대한 기본 보상 (자기부담금 50만원)',
 15000, 50000000, 500000, TRUE, 1, TRUE),
(1, 'CDW_SUPER', '슈퍼 자차손해보험', 'cdw', '자기부담금 없는 완전 보상',
 25000, 100000000, 0, TRUE, 2, TRUE),
(1, 'PAI', '탑승자상해보험 (PAI)', 'pai', '탑승자 상해 보상',
 10000, 30000000, 0, FALSE, 3, TRUE),
(1, 'LLI', '대인대물보험 (LLI)', 'lli', '제3자 배상책임 보험',
 8000, 200000000, 0, FALSE, 4, TRUE),
(2, 'CDW_STANDARD', '표준 자차보험', 'cdw', '차량 손해 표준 보상',
 18000, 50000000, 300000, TRUE, 1, TRUE);

-- 부가 옵션 샘플
INSERT INTO rentcar_extras (
    vendor_id, extra_code, extra_name, extra_type, description,
    pricing_type, price_krw, max_quantity, display_order, is_active
) VALUES
(1, 'GPS', 'GPS 내비게이션', 'gps', '최신 GPS 내비게이션 대여',
 'per_day', 5000, 1, 1, TRUE),
(1, 'CHILD_SEAT', '아동 카시트', 'child_seat', '영유아용 카시트 (최대 2개)',
 'per_rental', 20000, 2, 2, TRUE),
(1, 'WIFI', '포켓 와이파이', 'wifi', '무제한 데이터 포켓 와이파이',
 'per_day', 8000, 1, 3, TRUE),
(1, 'ADDITIONAL_DRIVER', '추가 운전자', 'additional_driver', '추가 운전자 등록 (최대 2명)',
 'per_rental', 30000, 2, 4, TRUE),
(1, 'AIRPORT_PICKUP', '공항 픽업 서비스', 'pickup_service', '제주공항 픽업 서비스',
 'per_rental', 15000, 1, 5, TRUE),
(2, 'GPS', 'GPS 네비게이션', 'gps', 'GPS 대여',
 'per_day', 5000, 1, 1, TRUE),
(2, 'SNOW_CHAIN', '스노우 체인', 'equipment', '겨울철 스노우 체인',
 'per_rental', 10000, 1, 6, TRUE);

-- 가용성 규칙 샘플
INSERT INTO rentcar_availability_rules (
    vendor_id, rule_name, rule_type, description,
    start_date, end_date, applicable_days, minimum_rental_days, priority, is_active
) VALUES
(1, '추석 연휴 최소 3일', 'minimum_stay', '추석 연휴 기간 최소 3일 이상 렌탈 필수',
 '2025-09-06', '2025-09-09', '["sat", "sun", "mon"]', 3, 10, TRUE),
(1, '설날 연휴 최소 2일', 'minimum_stay', '설날 연휴 최소 2일 이상 렌탈',
 '2025-01-28', '2025-01-30', '["tue", "wed", "thu"]', 2, 10, TRUE),
(2, '동계 올림픽 블랙아웃', 'blackout', '동계 올림픽 기간 렌탈 불가',
 '2026-02-06', '2026-02-22', NULL, NULL, 15, FALSE);

-- =====================================================
-- 완료 메시지
-- =====================================================
SELECT 'Phase 2: Advanced Features 테이블 생성 완료!' as status;
SELECT
    'rentcar_rate_plans' as table_name, COUNT(*) as sample_count FROM rentcar_rate_plans
UNION ALL
SELECT 'rentcar_insurance_plans', COUNT(*) FROM rentcar_insurance_plans
UNION ALL
SELECT 'rentcar_extras', COUNT(*) FROM rentcar_extras
UNION ALL
SELECT 'rentcar_availability_rules', COUNT(*) FROM rentcar_availability_rules;
