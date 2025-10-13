-- Phase 10-2: 기존 bookings 테이블 확장
-- HOLD 시스템 및 Lock Manager를 위한 추가 컬럼

-- 1. HOLD 만료 시각 추가
ALTER TABLE bookings ADD COLUMN hold_expires_at DATETIME COMMENT 'HOLD 만료 시각 (10분)';

-- 2. 취소 시각 추가
ALTER TABLE bookings ADD COLUMN cancelled_at DATETIME COMMENT '취소된 시각';

-- 3. 인덱스 추가 (HOLD 만료 처리 성능 최적화) - 컬럼 생성 후
ALTER TABLE bookings ADD INDEX idx_hold_status (status, payment_status, hold_expires_at);
ALTER TABLE bookings ADD INDEX idx_cancelled_at (cancelled_at);

-- 4. 예약 로그 테이블 생성
CREATE TABLE IF NOT EXISTS booking_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL COMMENT '액션 종류 (CREATED, HOLD_EXPIRED, CONFIRMED, CANCELLED, REFUNDED 등)',
  details TEXT COMMENT '상세 정보 (JSON 형식)',
  ip_address VARCHAR(45) COMMENT '요청 IP 주소',
  user_agent TEXT COMMENT 'User Agent',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_booking_id (booking_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) COMMENT='예약 변경 이력 로그 (감사 추적)';

-- 완료 메시지
SELECT 'Phase 10-2: bookings 테이블 확장 완료' AS message;
