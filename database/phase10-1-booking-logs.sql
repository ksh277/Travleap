-- Phase 10-1: 예약 로그 테이블 추가
-- HOLD 만료, 상태 변경 등 모든 예약 이벤트를 기록

-- 예약 로그 테이블
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

-- 기존 테이블에 hold_expires_at 컬럼이 없다면 추가
-- (이미 있으면 에러 무시)
ALTER TABLE lodging_bookings
ADD COLUMN hold_expires_at DATETIME COMMENT 'HOLD 만료 시각 (10분)';

-- 기존 테이블에 cancelled_at, cancel_reason 컬럼 확인 및 추가
ALTER TABLE lodging_bookings
ADD COLUMN cancelled_at DATETIME COMMENT '취소 시각';

ALTER TABLE lodging_bookings
ADD COLUMN cancel_reason VARCHAR(500) COMMENT '취소 사유';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_hold_status ON lodging_bookings(status, payment_status, hold_expires_at);
CREATE INDEX idx_cancelled_at ON lodging_bookings(cancelled_at);

-- booking_logs 외래키 제약 조건 (선택사항)
-- PlanetScale은 기본적으로 FK를 지원하지 않으므로 주석 처리
-- ALTER TABLE booking_logs
-- ADD CONSTRAINT fk_booking_logs_booking
-- FOREIGN KEY (booking_id) REFERENCES lodging_bookings(id) ON DELETE CASCADE;

-- 완료 메시지
SELECT 'Phase 10-1: 예약 로그 테이블 생성 완료' AS message;
