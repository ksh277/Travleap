-- ===============================================
-- rentcar_pms_config 테이블 생성
-- PMS 연동 설정 관리
-- ===============================================

CREATE TABLE IF NOT EXISTS rentcar_pms_config (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- 벤더 정보
  vendor_id INT NOT NULL COMMENT '렌트카 업체 ID',

  -- PMS 정보
  pms_name VARCHAR(100) NOT NULL COMMENT 'PMS 이름 (airbnb, booking_com, expedia 등)',
  pms_property_id VARCHAR(255) COMMENT 'PMS에서의 숙박업체/계정 ID',

  -- API 인증 정보
  api_key VARCHAR(500) COMMENT 'PMS API Key (암호화 권장)',
  api_secret VARCHAR(500) COMMENT 'PMS API Secret (암호화 권장)',

  -- 웹훅 설정
  webhook_url VARCHAR(500) COMMENT 'PMS로 상태 업데이트를 보낼 웹훅 URL',
  webhook_events JSON COMMENT '활성화된 웹훅 이벤트 목록 ["booking_confirmed", "booking_cancelled"]',

  -- 동기화 설정
  auto_sync_enabled BOOLEAN DEFAULT FALSE COMMENT '자동 동기화 활성화 여부',
  sync_interval_minutes INT DEFAULT 60 COMMENT '동기화 주기 (분)',
  last_synced_at DATETIME COMMENT '마지막 동기화 시각',

  -- 활성화 상태
  is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',

  -- 메타 정보
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(255) COMMENT '설정 생성자',

  -- 인덱스
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_pms_name (pms_name),
  INDEX idx_is_active (is_active),

  -- 외래키
  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,

  -- 제약조건: 한 벤더는 각 PMS당 하나의 설정만 가질 수 있음
  UNIQUE KEY uk_vendor_pms (vendor_id, pms_name)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='PMS 연동 설정';

-- ===============================================
-- rentcar_pms_sync_log 테이블 생성
-- PMS 동기화 이력 로그
-- ===============================================

CREATE TABLE IF NOT EXISTS rentcar_pms_sync_log (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- PMS 설정
  pms_config_id INT NOT NULL COMMENT 'PMS 설정 ID',

  -- 동기화 정보
  sync_type VARCHAR(50) NOT NULL COMMENT '동기화 타입 (manual, auto, webhook)',
  sync_direction VARCHAR(50) NOT NULL COMMENT '동기화 방향 (inbound, outbound)',

  -- 동기화 결과
  status ENUM('success', 'partial', 'failed') NOT NULL COMMENT '동기화 상태',
  items_processed INT DEFAULT 0 COMMENT '처리된 항목 수',
  items_succeeded INT DEFAULT 0 COMMENT '성공한 항목 수',
  items_failed INT DEFAULT 0 COMMENT '실패한 항목 수',

  -- 상세 정보
  error_message TEXT COMMENT '에러 메시지',
  sync_data JSON COMMENT '동기화된 데이터 요약',

  -- 시각
  started_at DATETIME NOT NULL COMMENT '동기화 시작 시각',
  completed_at DATETIME COMMENT '동기화 완료 시각',

  -- 인덱스
  INDEX idx_pms_config_id (pms_config_id),
  INDEX idx_status (status),
  INDEX idx_started_at (started_at),

  -- 외래키
  FOREIGN KEY (pms_config_id) REFERENCES rentcar_pms_config(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='PMS 동기화 이력';
