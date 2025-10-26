-- ===============================================
-- Rentcar Webhook Events Table
-- Toss Payments 웹훅 멱등성 처리를 위한 테이블
-- ===============================================

CREATE TABLE IF NOT EXISTS rentcar_webhook_events (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- 멱등성 키
  payment_key VARCHAR(200) NOT NULL COMMENT 'Toss Payments payment_key',
  event_type VARCHAR(50) NOT NULL COMMENT '이벤트 타입 (PAYMENT_CONFIRMED, REFUND_COMPLETED 등)',

  -- 이벤트 데이터
  event_data JSON COMMENT '전체 이벤트 데이터',

  -- 처리 상태
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending' COMMENT '처리 상태',
  error_message TEXT COMMENT '에러 메시지 (실패 시)',

  -- 타임스탬프
  received_at DATETIME NOT NULL COMMENT '이벤트 수신 시각',
  processed_at DATETIME COMMENT '이벤트 처리 시각',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- UNIQUE 제약조건: 동일한 payment_key + event_type은 한 번만 처리
  UNIQUE KEY uk_payment_event (payment_key, event_type),

  -- 인덱스
  INDEX idx_payment_key (payment_key),
  INDEX idx_event_type (event_type),
  INDEX idx_status (status),
  INDEX idx_received_at (received_at)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='렌트카 웹훅 이벤트 로그 (멱등성 처리)';

-- 설명:
-- 1. UNIQUE 제약조건으로 동일한 이벤트 중복 처리 방지
-- 2. 동시에 두 개의 요청이 INSERT 시도해도 한 개만 성공
-- 3. 실패한 쪽은 ER_DUP_ENTRY 에러 → 이미 처리됨으로 간주
