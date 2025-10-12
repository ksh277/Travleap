-- ============================================
-- TravelAP 렌트카 시스템 업그레이드 SQL
-- 최상급 벤더 관리 및 예약 시스템
-- ============================================

-- ============================================
-- 1. VENDORS (렌트카 업체) 테이블 생성/업그레이드
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_vendors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL COMMENT '업체 고유 코드 (예: JEJU_001)',
    business_name VARCHAR(200) NOT NULL COMMENT '사업자명',
    brand_name VARCHAR(100) COMMENT '브랜드명',
    business_number VARCHAR(50) UNIQUE COMMENT '사업자등록번호',

    -- 연락처 정보
    contact_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    support_email VARCHAR(100),
    support_phone VARCHAR(50),
    support_timezone VARCHAR(50) DEFAULT 'Asia/Seoul',

    -- 사업 정보
    description TEXT,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    established_date DATE,

    -- 등급 및 상태
    tier ENUM('starter', 'standard', 'premium', 'enterprise') DEFAULT 'starter',
    status ENUM('pending', 'active', 'suspended', 'closed') DEFAULT 'pending',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,

    -- 계약 정보
    contract_start_date DATE,
    contract_end_date DATE,
    commission_rate DECIMAL(5,2) DEFAULT 15.00 COMMENT '수수료율 (%)',
    settlement_cycle ENUM('daily', 'weekly', 'biweekly', 'monthly') DEFAULT 'monthly',
    settlement_profile_id BIGINT COMMENT '정산 프로필 ID',

    -- 운영 설정
    default_currency VARCHAR(10) DEFAULT 'KRW',
    allowed_payment_methods JSON COMMENT '허용 결제수단',
    business_hours JSON COMMENT '영업시간 설정',

    -- 메타데이터
    total_vehicles INT DEFAULT 0,
    total_locations INT DEFAULT 0,
    total_bookings INT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vendor_code (vendor_code),
    INDEX idx_status (status),
    INDEX idx_tier (tier)
) COMMENT='렌트카 업체 마스터';

-- ============================================
-- 2. VENDOR_USERS (벤더 사용자) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_vendor_users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),

    -- 권한 관리
    role ENUM('owner', 'admin', 'manager', 'staff') DEFAULT 'staff',
    permissions JSON COMMENT '세부 권한 설정',

    -- 보안
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(100),
    last_login_at TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,

    -- 상태
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vendor_email (vendor_id, email),
    INDEX idx_email (email),
    INDEX idx_vendor_status (vendor_id, status)
) COMMENT='벤더 포털 사용자';

-- ============================================
-- 3. LOCATIONS (픽업/반납 지점) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_locations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    location_code VARCHAR(50) NOT NULL COMMENT '지점 코드',
    name VARCHAR(200) NOT NULL,

    -- 유형
    location_type ENUM('airport', 'downtown', 'station', 'port', 'hotel') DEFAULT 'downtown',
    iata_code VARCHAR(10) COMMENT '공항 코드 (예: CJU)',

    -- 주소 정보
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'KR',
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),

    -- 운영 정보
    operating_hours JSON COMMENT '영업시간 (요일별)',
    after_hours_policy_json JSON COMMENT '영업시간 외 픽업/반납 정책',
    after_hours_fee_krw INT DEFAULT 0,

    -- 수수료
    pickup_fee_krw INT DEFAULT 0,
    dropoff_fee_krw INT DEFAULT 0,
    one_way_allowed BOOLEAN DEFAULT TRUE,

    -- 연락처
    phone VARCHAR(50),
    email VARCHAR(100),

    -- 편의시설
    facilities JSON COMMENT '주차, WiFi, 라운지 등',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vendor_location_code (vendor_id, location_code),
    INDEX idx_vendor_active (vendor_id, is_active),
    INDEX idx_location_type (location_type),
    INDEX idx_coordinates (lat, lng)
) COMMENT='렌트카 픽업/반납 지점';

-- ============================================
-- 4. VEHICLES (차량 마스터) 테이블 업그레이드
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_vehicles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    vehicle_code VARCHAR(50) NOT NULL COMMENT '차량 코드',

    -- 기본 정보
    brand VARCHAR(50) NOT NULL COMMENT '제조사 (현대, 기아, BMW 등)',
    model VARCHAR(100) NOT NULL COMMENT '모델명',
    trim VARCHAR(100) COMMENT '트림 (예: 프레스티지)',
    year INT NOT NULL COMMENT '연식',

    -- 표시명 (다국어 지원)
    display_name VARCHAR(200) NOT NULL COMMENT '표시명',
    locale_labels_json JSON COMMENT '다국어 라벨 {ko, en, zh, ja}',

    -- 분류
    vehicle_class ENUM('compact', 'midsize', 'fullsize', 'luxury', 'suv', 'van', 'truck', 'electric') NOT NULL,
    vehicle_type VARCHAR(50) COMMENT '세부 타입 (세단, SUV, 승합 등)',

    -- 엔진/성능
    fuel_type ENUM('gasoline', 'diesel', 'electric', 'hybrid', 'plug-in-hybrid') NOT NULL,
    transmission ENUM('manual', 'automatic', 'cvt', 'dct') DEFAULT 'automatic',
    drive_type ENUM('fwd', 'rwd', 'awd', '4wd') COMMENT '구동방식',
    engine_cc INT COMMENT '배기량 (cc)',
    horsepower INT COMMENT '마력',
    torque_nm INT COMMENT '토크 (Nm)',

    -- 환경/경제성
    fuel_efficiency_kmpl DECIMAL(5,2) COMMENT '연비 (km/L)',
    co2_gpkm INT COMMENT 'CO2 배출량 (g/km)',
    range_km INT COMMENT '주행거리 (전기차)',

    -- 탑승/수하물
    seating_capacity INT NOT NULL DEFAULT 5,
    door_count INT DEFAULT 4,
    large_bags INT COMMENT '대형 수하물',
    small_bags INT COMMENT '소형 수하물',

    -- 이미지
    thumbnail_url VARCHAR(500),
    images JSON COMMENT '이미지 URL 배열',
    image_hashes_json JSON COMMENT '이미지 해시 (중복 방지)',

    -- 장비/옵션
    standard_features JSON COMMENT '기본 장비 (네비, 후방카메라 등)',
    optional_features JSON COMMENT '선택 옵션',

    -- 정책
    age_requirement INT DEFAULT 21,
    license_requirement TEXT COMMENT '면허 요구사항',
    mileage_limit_per_day INT COMMENT '일일 주행거리 제한 (km)',
    unlimited_mileage BOOLEAN DEFAULT FALSE,
    deposit_amount_krw INT DEFAULT 0,
    smoking_allowed BOOLEAN DEFAULT FALSE,
    fuel_policy ENUM('full_to_full', 'prepaid', 'same_to_same') DEFAULT 'full_to_full',

    -- 데이터 소스 (Manual, Bulk, API)
    source ENUM('manual', 'bulk', 'api') DEFAULT 'manual',
    external_id VARCHAR(100) COMMENT '외부 시스템 ID',
    source_last_synced_at TIMESTAMP NULL,
    override_flags_json JSON COMMENT '필드별 오버라이드 설정',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,

    -- 메타
    total_bookings INT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vendor_vehicle_code (vendor_id, vehicle_code),
    INDEX idx_vendor_active (vendor_id, is_active),
    INDEX idx_class_fuel (vehicle_class, fuel_type),
    INDEX idx_brand_model (brand, model),
    INDEX idx_source (source)
) COMMENT='렌트카 차량 마스터';

-- ============================================
-- 5. RATE_PLANS (요금제) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_rate_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    vehicle_id BIGINT NOT NULL,

    -- 요금제 정보
    rate_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- 기간
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    min_rental_days INT DEFAULT 1,
    max_rental_days INT DEFAULT 30,

    -- 기본 요금
    daily_rate_krw INT NOT NULL COMMENT '일일 기본 요금',
    weekly_rate_krw INT COMMENT '주간 요금 (7일)',
    monthly_rate_krw INT COMMENT '월간 요금 (30일)',

    -- 추가 요금
    hourly_rate_krw INT COMMENT '시간당 요금',
    weekend_markup_pct DECIMAL(5,2) DEFAULT 0.00 COMMENT '주말 할증 (%)',
    holiday_markup_pct DECIMAL(5,2) DEFAULT 0.00 COMMENT '공휴일 할증 (%)',
    peak_season_markup_pct DECIMAL(5,2) DEFAULT 0.00 COMMENT '성수기 할증 (%)',

    -- 원웨이
    one_way_fee_krw INT DEFAULT 0,
    one_way_allowed BOOLEAN DEFAULT TRUE,

    -- 연령 할증
    young_driver_surcharge_rules_json JSON COMMENT '젊은 운전자 할증 규칙',
    senior_driver_surcharge_rules_json JSON COMMENT '고령 운전자 할증 규칙',

    -- 영업시간 외
    after_hours_fee_krw INT DEFAULT 0,

    -- 프로모션
    promotion_rules_json JSON COMMENT '프로모션 규칙 (쿠폰, 할인)',

    -- 세금/수수료
    tax_rate_pct DECIMAL(5,2) DEFAULT 10.00 COMMENT '세율 (%)',
    service_fee_krw INT DEFAULT 0,

    -- 취소 정책
    cancellation_policy_json JSON COMMENT '취소 수수료 규칙',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0 COMMENT '우선순위 (높을수록 우선)',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES rentcar_vehicles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vendor_rate_code (vendor_id, rate_code),
    INDEX idx_vehicle_active (vehicle_id, is_active),
    INDEX idx_valid_period (valid_from, valid_to)
) COMMENT='렌트카 요금제';

-- ============================================
-- 6. INSURANCE_PLANS (보험 상품) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_insurance_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,

    -- 보험 정보
    insurance_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    insurance_type ENUM('basic', 'standard', 'premium', 'comprehensive') DEFAULT 'basic',

    -- 가격
    daily_price_krw INT NOT NULL,
    weekly_price_krw INT,
    monthly_price_krw INT,

    -- 보장 범위
    coverage_json JSON COMMENT '보장 항목 상세',
    deductible_krw INT DEFAULT 0 COMMENT '자기부담금',
    liability_limit_krw BIGINT COMMENT '대인/대물 한도',

    -- 보증금
    deposit_required_krw INT DEFAULT 0,
    deposit_waived BOOLEAN DEFAULT FALSE COMMENT '보증금 면제 여부',

    -- 연령대별 가격
    age_bands_json JSON COMMENT '연령대별 할증/할인',

    -- 포함/제외 사항
    included_coverage JSON COMMENT '포함 보장',
    excluded_coverage JSON COMMENT '제외 보장',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    is_recommended BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vendor_insurance_code (vendor_id, insurance_code),
    INDEX idx_vendor_active (vendor_id, is_active),
    INDEX idx_type (insurance_type)
) COMMENT='렌트카 보험 상품';

-- ============================================
-- 7. EXTRAS (추가 옵션) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_extras (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,

    -- 옵션 정보
    extra_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('equipment', 'service', 'driver', 'insurance', 'misc') DEFAULT 'equipment',
    sku VARCHAR(100) COMMENT 'SKU 코드',

    -- 가격
    price_type ENUM('per_day', 'per_rental', 'per_hour', 'per_item') DEFAULT 'per_day',
    price_krw INT NOT NULL,

    -- 수량
    max_quantity INT DEFAULT 1 COMMENT '최대 주문 수량',
    max_per_booking INT DEFAULT 1 COMMENT '예약당 최대 수량',
    requires_approval BOOLEAN DEFAULT FALSE,

    -- 재고
    has_inventory BOOLEAN DEFAULT FALSE,
    current_stock INT DEFAULT 0,

    -- 세금
    taxable BOOLEAN DEFAULT TRUE,
    tax_rate_pct DECIMAL(5,2) DEFAULT 10.00,

    -- 이미지
    image_url VARCHAR(500),

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vendor_extra_code (vendor_id, extra_code),
    INDEX idx_vendor_active (vendor_id, is_active),
    INDEX idx_category (category)
) COMMENT='렌트카 추가 옵션';

-- ============================================
-- 8. AVAILABILITY_RULES (가용성 규칙) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_availability_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    vehicle_id BIGINT NOT NULL,
    location_id BIGINT NOT NULL,

    -- 기간
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,

    -- 재고
    total_quantity INT NOT NULL DEFAULT 1 COMMENT '총 보유 대수',
    available_quantity INT NOT NULL DEFAULT 1 COMMENT '예약 가능 대수',
    reserved_quantity INT DEFAULT 0 COMMENT '예약된 대수',

    -- 시간 단위
    time_granularity ENUM('day', 'hour') DEFAULT 'day',
    cutoff_hours INT DEFAULT 2 COMMENT '예약 마감 시간 (픽업 전 N시간)',

    -- 블랙아웃
    is_blackout BOOLEAN DEFAULT FALSE COMMENT '예약 불가 기간',
    blackout_reason TEXT,

    -- 최소/최대 대여일
    min_rental_days INT DEFAULT 1,
    max_rental_days INT DEFAULT 30,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES rentcar_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES rentcar_locations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vehicle_location_period (vehicle_id, location_id, valid_from, valid_to),
    INDEX idx_vehicle_location_date (vehicle_id, location_id, valid_from, valid_to),
    INDEX idx_available_quantity (available_quantity)
) COMMENT='렌트카 가용성 규칙';

-- ============================================
-- 9. BOOKINGS (예약) 테이블 업그레이드
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_number VARCHAR(50) UNIQUE NOT NULL,

    -- 업체/차량
    vendor_id BIGINT NOT NULL,
    vehicle_id BIGINT NOT NULL,
    rate_plan_id BIGINT,

    -- 고객
    user_id BIGINT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_license_number VARCHAR(50),

    -- 픽업/반납
    pickup_location_id BIGINT NOT NULL,
    dropoff_location_id BIGINT NOT NULL,
    pickup_date DATE NOT NULL,
    dropoff_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    dropoff_time TIME NOT NULL,
    pickup_at_utc TIMESTAMP COMMENT 'UTC 기준 픽업 시간',
    dropoff_at_utc TIMESTAMP COMMENT 'UTC 기준 반납 시간',

    -- 보험/옵션
    insurance_plan_id BIGINT,
    extras JSON COMMENT '선택 옵션 [{extra_id, quantity, price}]',

    -- 가격
    base_price_krw INT NOT NULL,
    insurance_price_krw INT DEFAULT 0,
    extras_price_krw INT DEFAULT 0,
    tax_amount_krw INT DEFAULT 0,
    service_fee_krw INT DEFAULT 0,
    discount_amount_krw INT DEFAULT 0,
    total_price_krw INT NOT NULL,
    pricing_breakdown_json JSON COMMENT '가격 상세 내역',

    -- 예약 상태
    status ENUM('hold', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') DEFAULT 'hold',
    hold_expires_at TIMESTAMP NULL COMMENT 'HOLD 만료 시간',
    confirmed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT,

    -- 결제
    payment_status ENUM('pending', 'authorized', 'captured', 'refunded', 'failed') DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_transaction_id VARCHAR(100),

    -- 중복 방지
    idempotency_key VARCHAR(100) UNIQUE COMMENT '중복 예약 방지 키',

    -- 외부 시스템
    external_reference VARCHAR(100) COMMENT '외부 시스템 참조 ID',
    source ENUM('web', 'mobile', 'api', 'partner') DEFAULT 'web',

    -- 특별 요청
    special_requests TEXT,
    internal_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id),
    FOREIGN KEY (vehicle_id) REFERENCES rentcar_vehicles(id),
    FOREIGN KEY (rate_plan_id) REFERENCES rentcar_rate_plans(id),
    FOREIGN KEY (pickup_location_id) REFERENCES rentcar_locations(id),
    FOREIGN KEY (dropoff_location_id) REFERENCES rentcar_locations(id),
    FOREIGN KEY (insurance_plan_id) REFERENCES rentcar_insurance_plans(id),
    INDEX idx_vendor_status (vendor_id, status),
    INDEX idx_user_id (user_id),
    INDEX idx_pickup_date (pickup_date),
    INDEX idx_status_payment (status, payment_status),
    INDEX idx_hold_expires (hold_expires_at)
) COMMENT='렌트카 예약';

-- ============================================
-- 10. API_CREDENTIALS (API 연동 인증) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_api_credentials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,

    -- 인증 정보
    api_key VARCHAR(100) UNIQUE NOT NULL,
    api_secret_hash VARCHAR(255) NOT NULL COMMENT '암호화된 Secret',

    -- 권한
    scopes JSON COMMENT '허용 API 범위 [vehicles, rates, bookings, etc]',
    rate_limit_policy_json JSON COMMENT 'Rate Limiting 정책',

    -- Webhook
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    webhook_events JSON COMMENT '구독 이벤트',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    INDEX idx_vendor (vendor_id),
    INDEX idx_api_key (api_key)
) COMMENT='벤더 API 인증';

-- ============================================
-- 11. PRICE_CACHE (가격 캐시) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_price_cache (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL COMMENT 'Hash 키 (차량+기간+옵션)',

    -- 검색 조건
    vehicle_id BIGINT NOT NULL,
    pickup_location_id BIGINT NOT NULL,
    dropoff_location_id BIGINT NOT NULL,
    pickup_date DATE NOT NULL,
    dropoff_date DATE NOT NULL,

    -- 캐시된 가격
    cached_price_json JSON NOT NULL COMMENT '계산된 가격 상세',

    -- TTL
    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_cache_key (cache_key),
    INDEX idx_expires (expires_at),
    INDEX idx_vehicle_dates (vehicle_id, pickup_date, dropoff_date)
) COMMENT='가격 계산 캐시 (5~10분 TTL)';

-- ============================================
-- 12. SYNC_JOBS (API 동기화 작업) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_sync_jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL,

    -- 작업 정보
    job_type ENUM('full_sync', 'delta_sync', 'vehicle_sync', 'rate_sync', 'availability_sync') NOT NULL,
    sync_source ENUM('api', 'bulk_upload', 'manual') NOT NULL,

    -- 상태
    status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    progress_pct DECIMAL(5,2) DEFAULT 0.00,

    -- 결과
    total_records INT DEFAULT 0,
    processed_records INT DEFAULT 0,
    created_records INT DEFAULT 0,
    updated_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    error_log JSON COMMENT '에러 상세',

    -- 시간
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    INDEX idx_vendor_status (vendor_id, status),
    INDEX idx_job_type (job_type),
    INDEX idx_created_at (created_at)
) COMMENT='API/대량 동기화 작업 추적';

-- ============================================
-- 13. MAPPING_DICTS (표준 매핑 사전) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_mapping_dicts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT,

    -- 매핑 유형
    mapping_type ENUM('vehicle_class', 'fuel_type', 'transmission', 'insurance_type', 'location_code') NOT NULL,

    -- 매핑
    external_value VARCHAR(100) NOT NULL COMMENT '외부 시스템 값',
    internal_value VARCHAR(100) NOT NULL COMMENT '내부 표준 값',

    -- 우선순위
    priority INT DEFAULT 0,

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_mapping (vendor_id, mapping_type, external_value),
    INDEX idx_type (mapping_type),
    INDEX idx_external (external_value)
) COMMENT='외부 API 표준 매핑 사전';

-- ============================================
-- 14. AUDIT_LOGS (감사 로그) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- 액터
    actor_type ENUM('vendor_user', 'admin', 'system', 'api') NOT NULL,
    actor_id BIGINT,
    actor_email VARCHAR(100),

    -- 대상
    entity_type VARCHAR(50) NOT NULL COMMENT 'vehicles, bookings, rates 등',
    entity_id BIGINT,

    -- 작업
    action ENUM('create', 'update', 'delete', 'sync', 'approve', 'reject') NOT NULL,

    -- 변경 내역
    old_values JSON COMMENT '변경 전 값',
    new_values JSON COMMENT '변경 후 값',
    changed_fields JSON COMMENT '변경된 필드 목록',

    -- 메타
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_actor (actor_type, actor_id),
    INDEX idx_created_at (created_at)
) COMMENT='변경 이력 감사 로그';

-- ============================================
-- 15. 기존 테이블 업그레이드
-- ============================================

-- partners 테이블에 렌트카 관련 컬럼 추가
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS vendor_type ENUM('tour', 'accommodation', 'rentcar', 'activity', 'food') DEFAULT 'tour',
ADD COLUMN IF NOT EXISTS settlement_profile_id BIGINT COMMENT '정산 프로필',
ADD COLUMN IF NOT EXISTS support_timezone VARCHAR(50) DEFAULT 'Asia/Seoul';

-- listing_rentcar 테이블 업그레이드 (기존 테이블 확장)
ALTER TABLE listing_rentcar
ADD COLUMN IF NOT EXISTS year INT COMMENT '연식',
ADD COLUMN IF NOT EXISTS drive_type ENUM('fwd', 'rwd', 'awd', '4wd') COMMENT '구동방식',
ADD COLUMN IF NOT EXISTS range_km INT COMMENT '주행거리(전기차)',
ADD COLUMN IF NOT EXISTS co2_gpkm INT COMMENT 'CO2 배출량',
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200) COMMENT '표시명',
ADD COLUMN IF NOT EXISTS locale_labels_json JSON COMMENT '다국어 라벨',
ADD COLUMN IF NOT EXISTS image_hashes_json JSON COMMENT '이미지 해시',
ADD COLUMN IF NOT EXISTS override_flags_json JSON COMMENT '오버라이드 설정',
ADD COLUMN IF NOT EXISTS source ENUM('manual', 'bulk', 'api') DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_last_synced_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS external_id VARCHAR(100) COMMENT '외부 시스템 ID';

-- bookings 테이블에 렌트카 전용 컬럼 추가
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMP NULL COMMENT 'HOLD 만료시간',
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) UNIQUE COMMENT '중복방지키',
ADD COLUMN IF NOT EXISTS pricing_breakdown_json JSON COMMENT '가격상세',
ADD COLUMN IF NOT EXISTS pickup_location_id BIGINT COMMENT '픽업지점',
ADD COLUMN IF NOT EXISTS dropoff_location_id BIGINT COMMENT '반납지점',
ADD COLUMN IF NOT EXISTS pickup_at_utc TIMESTAMP COMMENT 'UTC 픽업시간',
ADD COLUMN IF NOT EXISTS dropoff_at_utc TIMESTAMP COMMENT 'UTC 반납시간',
ADD COLUMN IF NOT EXISTS external_reference VARCHAR(100) COMMENT '외부 참조ID';

-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

-- 검색 성능 향상
CREATE INDEX IF NOT EXISTS idx_vehicles_search ON rentcar_vehicles(vendor_id, vehicle_class, fuel_type, seating_capacity, is_active);
CREATE INDEX IF NOT EXISTS idx_rates_search ON rentcar_rate_plans(vehicle_id, valid_from, valid_to, is_active);
CREATE INDEX IF NOT EXISTS idx_availability_search ON rentcar_availability_rules(vehicle_id, location_id, valid_from, valid_to, available_quantity);

-- 예약 조회 성능
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_date ON rentcar_bookings(vendor_id, pickup_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON rentcar_bookings(user_id, status, created_at DESC);

-- 캐시 효율
CREATE INDEX IF NOT EXISTS idx_price_cache_lookup ON rentcar_price_cache(vehicle_id, pickup_date, dropoff_date, expires_at);

-- ============================================
-- 완료
-- ============================================
-- 렌트카 시스템 업그레이드 완료!
-- 다음 단계: API 엔드포인트 구현 및 벤더 포털 UI 개발
