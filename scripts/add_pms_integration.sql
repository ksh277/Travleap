-- PMS 연동 설정 테이블
-- 렌트카 업체가 PMS API 키를 저장하고 자동 동기화 설정

-- 1. rentcar_vendors 테이블에 PMS 관련 필드 추가
ALTER TABLE rentcar_vendors
ADD COLUMN IF NOT EXISTS pms_provider VARCHAR(50) COMMENT 'PMS 제공사 (turo, getaround, rentcars, custom)',
ADD COLUMN IF NOT EXISTS pms_api_key VARCHAR(255) COMMENT 'PMS API 키 (암호화 권장)',
ADD COLUMN IF NOT EXISTS pms_api_secret VARCHAR(255) COMMENT 'PMS API Secret (암호화 권장)',
ADD COLUMN IF NOT EXISTS pms_endpoint VARCHAR(500) COMMENT 'PMS API 엔드포인트 URL',
ADD COLUMN IF NOT EXISTS pms_sync_enabled BOOLEAN DEFAULT FALSE COMMENT 'PMS 자동 동기화 활성화',
ADD COLUMN IF NOT EXISTS pms_last_sync DATETIME COMMENT '마지막 동기화 시간',
ADD COLUMN IF NOT EXISTS pms_sync_interval INT DEFAULT 3600 COMMENT '동기화 주기 (초, 기본 1시간)';

-- 2. PMS 동기화 로그 테이블 생성
CREATE TABLE IF NOT EXISTS pms_sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  sync_status ENUM('success', 'failed', 'partial') NOT NULL,
  vehicles_added INT DEFAULT 0,
  vehicles_updated INT DEFAULT 0,
  vehicles_deleted INT DEFAULT 0,
  error_message TEXT,
  sync_started_at DATETIME NOT NULL,
  sync_completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_sync_status (sync_status),
  INDEX idx_created_at (created_at)
) COMMENT='PMS 동기화 로그';

-- 3. PMS 차량 매핑 테이블 (PMS ID <-> 우리 시스템 ID)
CREATE TABLE IF NOT EXISTS pms_vehicle_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  pms_vehicle_id VARCHAR(255) NOT NULL COMMENT 'PMS에서의 차량 ID',
  local_vehicle_id INT NOT NULL COMMENT '우리 시스템의 rentcar_vehicles.id',
  pms_provider VARCHAR(50) NOT NULL,
  last_synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (local_vehicle_id) REFERENCES rentcar_vehicles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_pms_vehicle (vendor_id, pms_provider, pms_vehicle_id),
  INDEX idx_local_vehicle_id (local_vehicle_id)
) COMMENT='PMS 차량 ID 매핑';

-- 확인
SELECT 'rentcar_vendors 테이블 PMS 필드 확인' as step;
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rentcar_vendors'
    AND COLUMN_NAME LIKE 'pms_%';

SELECT 'pms_sync_logs 테이블 확인' as step;
SHOW CREATE TABLE pms_sync_logs;

SELECT 'pms_vehicle_mapping 테이블 확인' as step;
SHOW CREATE TABLE pms_vehicle_mapping;
