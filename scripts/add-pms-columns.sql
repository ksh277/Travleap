-- PMS 연동을 위한 컬럼 추가

-- 1. rooms 테이블에 room_code 추가 (PMS에서 사용하는 고유 코드)
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS room_code VARCHAR(100) AFTER lodging_id;

-- 2. rooms 테이블에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_lodging_id ON rooms(lodging_id);

-- 3. rentcar_vendors 테이블에 PMS 설정 컬럼 추가
ALTER TABLE rentcar_vendors
ADD COLUMN IF NOT EXISTS pms_provider VARCHAR(50) AFTER commission_rate;

ALTER TABLE rentcar_vendors
ADD COLUMN IF NOT EXISTS pms_api_key VARCHAR(255) AFTER pms_provider;

ALTER TABLE rentcar_vendors
ADD COLUMN IF NOT EXISTS pms_property_id VARCHAR(100) AFTER pms_api_key;

ALTER TABLE rentcar_vendors
ADD COLUMN IF NOT EXISTS pms_last_sync TIMESTAMP NULL AFTER pms_property_id;

-- 4. 기존 rooms의 room_code 자동 생성 (NULL인 경우)
UPDATE rooms
SET room_code = CONCAT('ROOM-', id)
WHERE room_code IS NULL OR room_code = '';

-- 완료 메시지
SELECT 'PMS 연동을 위한 컬럼이 추가되었습니다.' AS message;
