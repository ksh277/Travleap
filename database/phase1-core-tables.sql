-- ============================================
-- Phase 1: 렌트카 시스템 핵심 테이블
-- 목표: 벤더 관리 + 차량 등록 + 기본 예약
-- ============================================

-- ============================================
-- 1. RENTCAR_VENDORS (렌트카 업체)
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_vendors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- 기본 정보
    vendor_code VARCHAR(50) UNIQUE NOT NULL COMMENT '업체 코드 (예: JEJU_RENT_01)',
    business_name VARCHAR(200) NOT NULL COMMENT '사업자명',
    brand_name VARCHAR(100) COMMENT '브랜드명 (예: 제주렌트카)',
    business_number VARCHAR(50) UNIQUE COMMENT '사업자등록번호',

    -- 연락처
    contact_name VARCHAR(100) NOT NULL COMMENT '담당자명',
    contact_email VARCHAR(100) NOT NULL COMMENT '이메일',
    contact_phone VARCHAR(50) NOT NULL COMMENT '전화번호',

    -- 사업 정보
    description TEXT COMMENT '업체 소개',
    logo_url VARCHAR(500) COMMENT '로고 URL',

    -- 상태
    status ENUM('pending', 'active', 'suspended') DEFAULT 'pending' COMMENT '승인 상태',
    is_verified BOOLEAN DEFAULT FALSE COMMENT '인증 여부',

    -- 계약
    commission_rate DECIMAL(5,2) DEFAULT 15.00 COMMENT '수수료율 (%)',

    -- 통계
    total_vehicles INT DEFAULT 0 COMMENT '총 차량 수',
    total_bookings INT DEFAULT 0 COMMENT '총 예약 수',
    average_rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '평균 평점',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vendor_code (vendor_code),
    INDEX idx_status (status),
    INDEX idx_verified (is_verified)
) COMMENT='렌트카 업체 마스터' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. RENTCAR_LOCATIONS (픽업/반납 지점)
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_locations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    vendor_id BIGINT NOT NULL COMMENT '업체 ID',
    location_code VARCHAR(50) NOT NULL COMMENT '지점 코드',
    name VARCHAR(200) NOT NULL COMMENT '지점명',

    -- 유형
    location_type ENUM('airport', 'downtown', 'station', 'hotel') DEFAULT 'downtown',

    -- 주소
    address VARCHAR(500) NOT NULL COMMENT '주소',
    city VARCHAR(100) COMMENT '도시',
    postal_code VARCHAR(20) COMMENT '우편번호',
    lat DECIMAL(10,7) COMMENT '위도',
    lng DECIMAL(10,7) COMMENT '경도',

    -- 운영
    operating_hours JSON COMMENT '영업시간',
    phone VARCHAR(50) COMMENT '전화번호',

    -- 수수료
    pickup_fee_krw INT DEFAULT 0 COMMENT '픽업 수수료',
    dropoff_fee_krw INT DEFAULT 0 COMMENT '반납 수수료',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 여부',
    display_order INT DEFAULT 0 COMMENT '표시 순서',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vendor_location (vendor_id, location_code),
    INDEX idx_vendor_active (vendor_id, is_active),
    INDEX idx_location_type (location_type),
    INDEX idx_coordinates (lat, lng)
) COMMENT='렌트카 픽업/반납 지점' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. RENTCAR_VEHICLES (차량 정보)
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_vehicles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    vendor_id BIGINT NOT NULL COMMENT '업체 ID',
    vehicle_code VARCHAR(50) NOT NULL COMMENT '차량 코드',

    -- 기본 정보
    brand VARCHAR(50) NOT NULL COMMENT '제조사 (현대, 기아, BMW 등)',
    model VARCHAR(100) NOT NULL COMMENT '모델명',
    year INT NOT NULL COMMENT '연식',
    display_name VARCHAR(200) NOT NULL COMMENT '표시명 (예: BMW 5시리즈 2024)',

    -- 분류
    vehicle_class ENUM('compact', 'midsize', 'fullsize', 'luxury', 'suv', 'van', 'electric') NOT NULL COMMENT '차급',
    vehicle_type VARCHAR(50) COMMENT '타입 (세단, SUV 등)',

    -- 엔진
    fuel_type ENUM('gasoline', 'diesel', 'electric', 'hybrid') NOT NULL COMMENT '연료',
    transmission ENUM('manual', 'automatic') DEFAULT 'automatic' COMMENT '변속기',

    -- 탑승
    seating_capacity INT NOT NULL DEFAULT 5 COMMENT '탑승 인원',
    door_count INT DEFAULT 4 COMMENT '도어 수',
    large_bags INT DEFAULT 2 COMMENT '대형 수하물',
    small_bags INT DEFAULT 2 COMMENT '소형 수하물',

    -- 이미지
    thumbnail_url VARCHAR(500) COMMENT '썸네일',
    images JSON COMMENT '이미지 배열',

    -- 장비
    features JSON COMMENT '기본 장비 (네비, 블랙박스 등)',

    -- 정책
    age_requirement INT DEFAULT 21 COMMENT '최소 나이',
    license_requirement TEXT COMMENT '면허 요구사항',
    mileage_limit_per_day INT DEFAULT 200 COMMENT '일일 주행거리 제한 (km)',
    unlimited_mileage BOOLEAN DEFAULT FALSE COMMENT '무제한 주행',
    deposit_amount_krw INT DEFAULT 0 COMMENT '보증금',
    smoking_allowed BOOLEAN DEFAULT FALSE COMMENT '흡연 가능',

    -- 가격 (기본)
    daily_rate_krw INT NOT NULL COMMENT '일일 기본 요금',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 여부',
    is_featured BOOLEAN DEFAULT FALSE COMMENT '추천 차량',
    total_bookings INT DEFAULT 0 COMMENT '총 예약 수',
    average_rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '평균 평점',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vendor_vehicle (vendor_id, vehicle_code),
    INDEX idx_vendor_active (vendor_id, is_active),
    INDEX idx_class_fuel (vehicle_class, fuel_type),
    INDEX idx_brand_model (brand, model),
    INDEX idx_price (daily_rate_krw)
) COMMENT='렌트카 차량 정보' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. RENTCAR_BOOKINGS (렌트카 예약)
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    booking_number VARCHAR(50) UNIQUE NOT NULL COMMENT '예약 번호',

    -- 업체/차량
    vendor_id BIGINT NOT NULL,
    vehicle_id BIGINT NOT NULL,

    -- 고객
    user_id BIGINT NOT NULL COMMENT '사용자 ID',
    customer_name VARCHAR(100) NOT NULL COMMENT '고객명',
    customer_email VARCHAR(100) NOT NULL COMMENT '이메일',
    customer_phone VARCHAR(50) NOT NULL COMMENT '전화번호',

    -- 픽업/반납
    pickup_location_id BIGINT NOT NULL COMMENT '픽업 지점',
    dropoff_location_id BIGINT NOT NULL COMMENT '반납 지점',
    pickup_date DATE NOT NULL COMMENT '픽업 날짜',
    pickup_time TIME NOT NULL COMMENT '픽업 시간',
    dropoff_date DATE NOT NULL COMMENT '반납 날짜',
    dropoff_time TIME NOT NULL COMMENT '반납 시간',

    -- 가격
    daily_rate_krw INT NOT NULL COMMENT '일일 요금',
    rental_days INT NOT NULL COMMENT '대여 일수',
    subtotal_krw INT NOT NULL COMMENT '소계',
    insurance_krw INT DEFAULT 0 COMMENT '보험료',
    extras_krw INT DEFAULT 0 COMMENT '추가 옵션',
    tax_krw INT DEFAULT 0 COMMENT '세금',
    discount_krw INT DEFAULT 0 COMMENT '할인',
    total_krw INT NOT NULL COMMENT '총 금액',

    -- 상태
    status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',

    -- 특별 요청
    special_requests TEXT COMMENT '특별 요청사항',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id),
    FOREIGN KEY (vehicle_id) REFERENCES rentcar_vehicles(id),
    FOREIGN KEY (pickup_location_id) REFERENCES rentcar_locations(id),
    FOREIGN KEY (dropoff_location_id) REFERENCES rentcar_locations(id),
    INDEX idx_vendor_status (vendor_id, status),
    INDEX idx_user (user_id),
    INDEX idx_pickup_date (pickup_date),
    INDEX idx_status (status, payment_status)
) COMMENT='렌트카 예약' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 테스트 데이터 삽입
-- ============================================

-- 샘플 벤더
INSERT INTO rentcar_vendors (vendor_code, business_name, brand_name, business_number, contact_name, contact_email, contact_phone, description, status, is_verified, commission_rate) VALUES
('JEJU_RENT_01', '제주렌트카', '제주렌트카', '123-45-67890', '김제주', 'jeju@rent.com', '064-123-4567', '제주도 최대 렌트카 업체', 'active', TRUE, 10.00),
('SHINAN_RENT_01', '신안렌트카', '신안렌트카', '987-65-43210', '박신안', 'shinan@rent.com', '061-234-5678', '신안군 전문 렌트카', 'active', TRUE, 12.00);

-- 샘플 지점
INSERT INTO rentcar_locations (vendor_id, location_code, name, location_type, address, city, lat, lng, phone, is_active) VALUES
(1, 'JEJU_AIRPORT', '제주공항점', 'airport', '제주특별자치도 제주시 공항로 2', '제주시', 33.5067, 126.4933, '064-123-4567', TRUE),
(1, 'JEJU_DOWNTOWN', '제주시내점', 'downtown', '제주특별자치도 제주시 중앙로 100', '제주시', 33.5000, 126.5000, '064-123-4568', TRUE),
(2, 'SHINAN_MAIN', '신안본점', 'downtown', '전라남도 신안군 지도읍 지도로 1', '신안군', 34.8167, 126.2333, '061-234-5678', TRUE);

-- 샘플 차량
INSERT INTO rentcar_vehicles (vendor_id, vehicle_code, brand, model, year, display_name, vehicle_class, vehicle_type, fuel_type, transmission, seating_capacity, door_count, large_bags, small_bags, features, age_requirement, mileage_limit_per_day, deposit_amount_krw, daily_rate_krw, is_active, is_featured) VALUES
(1, 'AVANTE_2024_001', '현대', '아반떼', 2024, '현대 아반떼 2024', 'compact', '세단', 'gasoline', 'automatic', 5, 4, 2, 2, '["네비게이션", "후방카메라", "블루투스"]', 21, 200, 300000, 50000, TRUE, TRUE),
(1, 'SONATA_2024_001', '현대', '소나타', 2024, '현대 소나타 2024', 'midsize', '세단', 'gasoline', 'automatic', 5, 4, 3, 2, '["네비게이션", "후방카메라", "크루즈컨트롤", "스마트키"]', 23, 200, 500000, 70000, TRUE, FALSE),
(1, 'KONA_EV_2024_001', '현대', '코나 EV', 2024, '현대 코나 일렉트릭 2024', 'electric', 'SUV', 'electric', 'automatic', 5, 4, 2, 2, '["네비게이션", "급속충전", "후방카메라"]', 25, 0, 500000, 80000, TRUE, TRUE),
(2, 'K5_2024_001', '기아', 'K5', 2024, '기아 K5 2024', 'midsize', '세단', 'gasoline', 'automatic', 5, 4, 3, 2, '["네비게이션", "어라운드뷰", "하이패스"]', 23, 200, 500000, 75000, TRUE, FALSE);

-- ============================================
-- 완료!
-- ============================================
-- Phase 1 핵심 테이블 생성 완료
-- 다음: TypeScript 타입 정의 및 API 구현
