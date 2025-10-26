-- ================================================================
-- 렌트카 검증 시스템 컬럼 추가
-- ================================================================
-- 목적: 렌트카 예약 확인, 차량 인수/반납 관리
-- 날짜: 2025-10-26
-- 기능:
--   - QR 코드 기반 예약 확인
--   - 바우처 시스템
--   - 차량 인수 체크인
--   - 차량 반납 체크아웃
--   - 차량 상태 기록
--   - 노쇼 및 취소 관리
-- ================================================================

-- 1. voucher_code (예약 확인 코드)
ALTER TABLE rentcar_bookings
ADD COLUMN voucher_code VARCHAR(50) UNIQUE
COMMENT '예약 확인 코드 (6자리 영숫자, 체크인 시 사용)';

-- 2. qr_code (QR 코드 데이터)
ALTER TABLE rentcar_bookings
ADD COLUMN qr_code TEXT
COMMENT 'QR 코드 데이터 (Base64 또는 URL)';

-- 3. pickup_checked_in_at (차량 인수 시각)
ALTER TABLE rentcar_bookings
ADD COLUMN pickup_checked_in_at DATETIME
COMMENT '차량 인수 체크인 시각';

-- 4. pickup_checked_in_by (인수 처리자)
ALTER TABLE rentcar_bookings
ADD COLUMN pickup_checked_in_by VARCHAR(100)
COMMENT '인수 처리한 직원명 또는 ID';

-- 5. pickup_vehicle_condition (인수 시 차량 상태)
ALTER TABLE rentcar_bookings
ADD COLUMN pickup_vehicle_condition JSON
COMMENT '인수 시 차량 상태: {mileage, fuel_level, damages, notes}';

-- 6. return_checked_out_at (차량 반납 시각)
ALTER TABLE rentcar_bookings
ADD COLUMN return_checked_out_at DATETIME
COMMENT '차량 반납 체크아웃 시각';

-- 7. return_checked_out_by (반납 처리자)
ALTER TABLE rentcar_bookings
ADD COLUMN return_checked_out_by VARCHAR(100)
COMMENT '반납 처리한 직원명 또는 ID';

-- 8. return_vehicle_condition (반납 시 차량 상태)
ALTER TABLE rentcar_bookings
ADD COLUMN return_vehicle_condition JSON
COMMENT '반납 시 차량 상태: {mileage, fuel_level, damages, additional_charges}';

-- 9. used_at (바우처 사용 시각)
ALTER TABLE rentcar_bookings
ADD COLUMN used_at DATETIME
COMMENT '바우처 최초 사용(체크인) 시각 (중복 사용 방지)';

-- 10. cancellation_reason (취소 사유)
ALTER TABLE rentcar_bookings
ADD COLUMN cancellation_reason TEXT
COMMENT '취소 또는 노쇼 사유';

-- 11. no_show_at (노쇼 기록 시각)
ALTER TABLE rentcar_bookings
ADD COLUMN no_show_at DATETIME
COMMENT '노쇼 처리 시각 (픽업 시간 + 유예시간 경과 후)';

-- ================================================================
-- 인덱스 추가 (성능 최적화)
-- ================================================================

-- 바우처 코드 조회 최적화
ALTER TABLE rentcar_bookings
ADD INDEX idx_voucher_code (voucher_code);

-- QR 코드 스캔 최적화 (사용 여부 확인)
ALTER TABLE rentcar_bookings
ADD INDEX idx_used_at (used_at);

-- 픽업/반납 날짜별 조회 최적화
ALTER TABLE rentcar_bookings
ADD INDEX idx_pickup_checked_in (pickup_checked_in_at);

ALTER TABLE rentcar_bookings
ADD INDEX idx_return_checked_out (return_checked_out_at);

-- 노쇼 관리 최적화
ALTER TABLE rentcar_bookings
ADD INDEX idx_no_show (no_show_at, status);

-- ================================================================
-- 취소 정책 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS cancellation_policies (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  -- 정책 기본 정보
  policy_name VARCHAR(100) NOT NULL COMMENT '정책명 (예: 표준 취소 정책)',
  category VARCHAR(50) NOT NULL COMMENT '카테고리 (rentcar, tour, accommodation 등)',

  -- 환불 규칙 (JSON 배열)
  -- 예: [
  --   {"hours_before": 72, "refund_rate": 100},
  --   {"hours_before": 48, "refund_rate": 80},
  --   {"hours_before": 24, "refund_rate": 50},
  --   {"hours_before": 0, "refund_rate": 0}
  -- ]
  rules_json JSON NOT NULL COMMENT '환불 규칙 JSON',

  -- 노쇼 페널티
  no_show_penalty_rate INT DEFAULT 100 COMMENT '노쇼 페널티 비율 (0-100%)',

  -- 활성화 여부
  is_active BOOLEAN DEFAULT TRUE,

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_category_active (category, is_active)
) COMMENT '취소 정책 테이블';

-- 기본 렌트카 취소 정책 삽입
INSERT INTO cancellation_policies (policy_name, category, rules_json, no_show_penalty_rate)
VALUES (
  '렌트카 표준 취소 정책',
  'rentcar',
  JSON_ARRAY(
    JSON_OBJECT('hours_before', 72, 'refund_rate', 100, 'description', '3일 전: 100% 환불'),
    JSON_OBJECT('hours_before', 48, 'refund_rate', 80, 'description', '2일 전: 80% 환불'),
    JSON_OBJECT('hours_before', 24, 'refund_rate', 50, 'description', '1일 전: 50% 환불'),
    JSON_OBJECT('hours_before', 0, 'refund_rate', 0, 'description', '당일 취소: 환불 불가')
  ),
  100
);

-- ================================================================
-- rentcar_bookings에 취소 정책 외래키 추가
-- ================================================================

ALTER TABLE rentcar_bookings
ADD COLUMN cancellation_policy_id BIGINT,
ADD CONSTRAINT fk_rentcar_booking_policy
  FOREIGN KEY (cancellation_policy_id)
  REFERENCES cancellation_policies(id)
  ON DELETE SET NULL;

-- ================================================================
-- 완료
-- ================================================================
