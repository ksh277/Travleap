-- 렌트카 차량 테이블에 새 필드 추가
-- 실행 방법: PlanetScale 대시보드에서 직접 실행하거나 MySQL 클라이언트로 실행

-- 1. 보험 관련 필드
ALTER TABLE rentcar_vehicles
ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT TRUE COMMENT '보험 포함 여부',
ADD COLUMN IF NOT EXISTS insurance_options TEXT COMMENT '보험 옵션 (예: 자차보험, 대인배상, 대물배상)',
ADD COLUMN IF NOT EXISTS available_options TEXT COMMENT '차량 옵션 (예: GPS, 블랙박스, 하이패스)';

-- 2. 픽업/반납 위치 필드
ALTER TABLE rentcar_vehicles
ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255) DEFAULT '신안군 렌트카 본점' COMMENT '픽업 위치',
ADD COLUMN IF NOT EXISTS dropoff_location VARCHAR(255) DEFAULT '신안군 렌트카 본점' COMMENT '반납 위치';

-- 3. 렌탈 기간 제한 필드
ALTER TABLE rentcar_vehicles
ADD COLUMN IF NOT EXISTS min_rental_days INT DEFAULT 1 COMMENT '최소 렌탈 기간 (일)',
ADD COLUMN IF NOT EXISTS max_rental_days INT DEFAULT 30 COMMENT '최대 렌탈 기간 (일)';

-- 4. 즉시 예약 vs 승인 필요
ALTER TABLE rentcar_vehicles
ADD COLUMN IF NOT EXISTS instant_booking BOOLEAN DEFAULT TRUE COMMENT '즉시 예약 가능 여부 (false면 승인 필요)';

-- 확인
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rentcar_vehicles'
    AND COLUMN_NAME IN (
        'insurance_included',
        'insurance_options',
        'available_options',
        'pickup_location',
        'dropoff_location',
        'min_rental_days',
        'max_rental_days',
        'instant_booking'
    );
