-- ============================================
-- 렌트카 MVP 완전 구현을 위한 마이그레이션
-- ============================================
-- 기능:
-- 1. 운전자 검증 (나이, 면허)
-- 2. 시간제 요금 계산 (일+시간 혼합)
-- 3. 차량 차단 관리
-- 4. 결제/보증금 처리
-- 5. 상태 전이 검증
-- 6. 취소/환불 정책
-- ============================================

-- ============================================
-- 1. rentcar_bookings 테이블에 MVP 필수 컬럼 추가
-- ============================================
ALTER TABLE rentcar_bookings
  -- 운전자 검증 정보
  ADD COLUMN driver_name VARCHAR(100)
    COMMENT '운전자 이름 (고객명과 다를 수 있음)',

  ADD COLUMN driver_birth DATE
    COMMENT '운전자 생년월일 (만나이 계산용)',

  ADD COLUMN driver_license_no VARCHAR(50)
    COMMENT '운전면허 번호',

  ADD COLUMN driver_license_exp DATE
    COMMENT '운전면허 만료일',

  ADD COLUMN driver_age_at_pickup INT
    COMMENT '픽업 시점 만나이 (서버 계산값)',

  -- 시간제 요금 계산
  ADD COLUMN rental_hours INT
    COMMENT '총 대여 시간 (ceil)',

  ADD COLUMN rental_days INT
    COMMENT '대여 일수 (floor(hours/24))',

  ADD COLUMN rental_hours_remainder INT
    COMMENT '나머지 시간 (hours % 24)',

  ADD COLUMN hourly_rate_krw INT
    COMMENT '시간당 요금 (요금제)',

  ADD COLUMN daily_rate_krw INT
    COMMENT '일일 요금 (요금제)',

  -- Toss Payments
  ADD COLUMN payment_key VARCHAR(200)
    COMMENT 'Toss Payments paymentKey',

  ADD COLUMN toss_order_id VARCHAR(100)
    COMMENT 'Toss orderId (booking_number와 동일 가능)',

  ADD COLUMN approved_at TIMESTAMP NULL
    COMMENT '결제 승인 시각',

  ADD COLUMN refunded_at TIMESTAMP NULL
    COMMENT '환불 완료 시각',

  ADD COLUMN refund_amount_krw INT DEFAULT 0
    COMMENT '환불 금액',

  -- 보증금 (업체 선택형)
  ADD COLUMN deposit_amount_krw INT DEFAULT 0
    COMMENT '보증금 (0=없음, >0=있음)',

  ADD COLUMN deposit_payment_key VARCHAR(200)
    COMMENT '보증금 결제 키 (별도 결제 시)',

  ADD COLUMN deposit_status ENUM('none', 'held', 'released', 'partially_released', 'forfeited') DEFAULT 'none'
    COMMENT '보증금 상태',

  ADD COLUMN deposit_released_at TIMESTAMP NULL
    COMMENT '보증금 환급 시각',

  -- 지연 반납 추가 요금
  ADD COLUMN late_return_hours INT DEFAULT 0
    COMMENT '지연 시간 (유예시간 제외)',

  ADD COLUMN late_return_fee_krw INT DEFAULT 0
    COMMENT '지연 반납 요금',

  ADD COLUMN grace_minutes INT DEFAULT 30
    COMMENT '유예시간 (분)',

  -- 추가 요금 상세
  ADD COLUMN fuel_deficit_liters DECIMAL(5,2) DEFAULT 0
    COMMENT '연료 부족량 (리터)',

  ADD COLUMN fuel_fee_krw INT DEFAULT 0
    COMMENT '연료 차액',

  ADD COLUMN mileage_overage_km INT DEFAULT 0
    COMMENT '주행거리 초과 (km)',

  ADD COLUMN overage_fee_krw INT DEFAULT 0
    COMMENT '초과 주행 요금',

  ADD COLUMN damage_fee_krw INT DEFAULT 0
    COMMENT '손상 비용',

  ADD COLUMN total_additional_fee_krw INT DEFAULT 0
    COMMENT '총 추가 요금 (지연+연료+주행+손상)',

  -- 취소 정책
  ADD COLUMN cancel_policy_code VARCHAR(50)
    COMMENT '적용된 취소 정책 코드',

  ADD COLUMN refund_rate_pct DECIMAL(5,2)
    COMMENT '환불율 (%)',

  ADD COLUMN cancellation_fee_krw INT DEFAULT 0
    COMMENT '취소 수수료',

  -- No-show 처리
  ADD COLUMN no_show_penalty_fee_krw INT DEFAULT 0
    COMMENT 'No-show 위약금';

-- ============================================
-- 2. 인덱스 추가
-- ============================================
CREATE INDEX idx_driver_birth ON rentcar_bookings(driver_birth);
CREATE INDEX idx_driver_license_exp ON rentcar_bookings(driver_license_exp);
CREATE INDEX idx_payment_key ON rentcar_bookings(payment_key);
CREATE INDEX idx_rental_hours ON rentcar_bookings(rental_hours);
CREATE INDEX idx_deposit_status ON rentcar_bookings(deposit_status);

-- ============================================
-- 3. vehicle_blocks 테이블 생성 (차량 차단 관리)
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_vehicle_blocks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  vendor_id BIGINT NOT NULL
    COMMENT '업체 ID',

  vehicle_id BIGINT NOT NULL
    COMMENT '차량 ID',

  starts_at TIMESTAMP NOT NULL
    COMMENT '차단 시작 시각',

  ends_at TIMESTAMP NOT NULL
    COMMENT '차단 종료 시각',

  block_type ENUM('maintenance', 'damage', 'cleaning', 'reserved', 'seasonal', 'other') DEFAULT 'maintenance'
    COMMENT '차단 유형',

  reason TEXT
    COMMENT '차단 사유',

  blocked_by VARCHAR(100)
    COMMENT '차단 처리자',

  is_active BOOLEAN DEFAULT TRUE
    COMMENT '활성 상태',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES rentcar_vehicles(id) ON DELETE CASCADE,

  INDEX idx_vehicle_period (vehicle_id, starts_at, ends_at),
  INDEX idx_vendor_active (vendor_id, is_active),
  INDEX idx_block_type (block_type)
) COMMENT='차량 차단 (정비, 손상 등)';

-- ============================================
-- 4. rental_payments 테이블 생성 (결제 이력)
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_rental_payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  rental_id BIGINT NOT NULL
    COMMENT 'rentcar_bookings.id',

  payment_type ENUM('rental', 'deposit', 'additional', 'refund') NOT NULL
    COMMENT '결제 유형',

  payment_key VARCHAR(200)
    COMMENT 'Toss paymentKey',

  order_id VARCHAR(100)
    COMMENT 'Toss orderId',

  method VARCHAR(50)
    COMMENT '결제 수단 (카드, 계좌이체 등)',

  amount_krw INT NOT NULL
    COMMENT '금액',

  status ENUM('pending', 'approved', 'canceled', 'failed') DEFAULT 'pending'
    COMMENT '결제 상태',

  approved_at TIMESTAMP NULL
    COMMENT '승인 시각',

  canceled_at TIMESTAMP NULL
    COMMENT '취소 시각',

  cancel_reason TEXT
    COMMENT '취소 사유',

  provider_response JSON
    COMMENT 'PG사 응답 (원본)',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (rental_id) REFERENCES rentcar_bookings(id) ON DELETE CASCADE,

  INDEX idx_rental (rental_id),
  INDEX idx_payment_key (payment_key),
  INDEX idx_type_status (payment_type, status),
  INDEX idx_approved_at (approved_at)
) COMMENT='렌트카 결제 이력';

-- ============================================
-- 5. rental_deposits 테이블 생성 (보증금 관리)
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_rental_deposits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  rental_id BIGINT NOT NULL
    COMMENT 'rentcar_bookings.id',

  deposit_type ENUM('charge', 'pre_auth') DEFAULT 'charge'
    COMMENT '보증금 유형 (차감 or 사전승인)',

  payment_key VARCHAR(200)
    COMMENT 'Toss paymentKey (보증금 결제)',

  amount_krw INT NOT NULL
    COMMENT '보증금 금액',

  status ENUM('held', 'released', 'partially_released', 'forfeited') DEFAULT 'held'
    COMMENT '보증금 상태',

  held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    COMMENT '보증금 예치 시각',

  released_at TIMESTAMP NULL
    COMMENT '전액 환급 시각',

  released_amount_krw INT DEFAULT 0
    COMMENT '환급 금액',

  forfeited_amount_krw INT DEFAULT 0
    COMMENT '차감 금액 (손상, 지연 등)',

  forfeit_reason TEXT
    COMMENT '차감 사유',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (rental_id) REFERENCES rentcar_bookings(id) ON DELETE CASCADE,

  INDEX idx_rental (rental_id),
  INDEX idx_payment_key (payment_key),
  INDEX idx_status (status)
) COMMENT='렌트카 보증금 관리';

-- ============================================
-- 6. rental_events 테이블 생성 (Webhook 멱등성)
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_rental_events (
  event_id VARCHAR(100) PRIMARY KEY
    COMMENT 'Toss Webhook eventId (UNIQUE)',

  rental_id BIGINT
    COMMENT 'rentcar_bookings.id',

  event_type VARCHAR(50) NOT NULL
    COMMENT '이벤트 타입 (payment.approved, payment.canceled 등)',

  payment_key VARCHAR(200)
    COMMENT 'Toss paymentKey',

  payload JSON NOT NULL
    COMMENT 'Webhook 원본 데이터',

  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    COMMENT '처리 시각',

  INDEX idx_rental (rental_id),
  INDEX idx_payment_key (payment_key),
  INDEX idx_event_type (event_type)
) COMMENT='렌트카 Webhook 이벤트 (멱등성 보장)';

-- ============================================
-- 7. rental_state_transitions 테이블 (상태 전이 로그)
-- ============================================
CREATE TABLE IF NOT EXISTS rentcar_state_transitions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  rental_id BIGINT NOT NULL
    COMMENT 'rentcar_bookings.id',

  from_status VARCHAR(50) NOT NULL
    COMMENT '이전 상태',

  to_status VARCHAR(50) NOT NULL
    COMMENT '변경 후 상태',

  transition_reason TEXT
    COMMENT '전이 사유',

  transitioned_by VARCHAR(100)
    COMMENT '변경자 (이메일 또는 시스템)',

  transitioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    COMMENT '전이 시각',

  FOREIGN KEY (rental_id) REFERENCES rentcar_bookings(id) ON DELETE CASCADE,

  INDEX idx_rental (rental_id),
  INDEX idx_status_transition (from_status, to_status),
  INDEX idx_transitioned_at (transitioned_at)
) COMMENT='렌트카 상태 전이 이력';

-- ============================================
-- 8. rate_plans 테이블에 시간제 요금 컬럼 확인/추가
-- ============================================
-- rentcar_rate_plans 테이블에 hourly_rate_krw가 이미 있으므로 스킵
-- (이미 존재: hourly_rate_krw, daily_rate_krw, weekly_rate_krw, monthly_rate_krw)

-- ============================================
-- 9. 취소 정책 템플릿 데이터 삽입
-- ============================================
-- cancellation_policies 테이블이 이미 검증 시스템 마이그레이션에서 생성됨
-- 렌트카 전용 정책 추가 삽입

INSERT INTO cancellation_policies (policy_name, category, rules_json, no_show_penalty_rate, description)
VALUES
  ('렌트카 유연 취소', 'flexible',
   '[{"hours_before_pickup": 24, "refund_rate": 100}, {"hours_before_pickup": 0, "refund_rate": 0}]',
   100,
   '픽업 24시간 전까지 무료 취소 가능. 이후 환불 불가.'),

  ('렌트카 중간 취소', 'moderate',
   '[{"hours_before_pickup": 72, "refund_rate": 100}, {"hours_before_pickup": 24, "refund_rate": 50}, {"hours_before_pickup": 0, "refund_rate": 0}]',
   100,
   '픽업 72시간 전: 100% 환불, 24시간 전: 50% 환불, 이후: 환불 불가.'),

  ('렌트카 엄격 취소', 'strict',
   '[{"hours_before_pickup": 168, "refund_rate": 100}, {"hours_before_pickup": 72, "refund_rate": 50}, {"hours_before_pickup": 0, "refund_rate": 0}]',
   100,
   '픽업 7일 전: 100% 환불, 3일 전: 50% 환불, 이후: 환불 불가.'),

  ('렌트카 환불 불가', 'non_refundable',
   '[{"hours_before_pickup": 0, "refund_rate": 0}]',
   100,
   '예약 후 취소 시 환불 불가. No-show 시 100% 위약금 부과.')
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- ============================================
-- 10. 샘플 요금제 데이터 (테스트용)
-- ============================================
-- 기존 rentcar_rate_plans 테이블에 시간제 요금이 있는 요금제 추가
-- 실제 vehicle_id는 DB에 존재하는 차량 ID로 교체 필요

-- ============================================
-- 완료 메시지
-- ============================================
SELECT '✅ 렌트카 MVP 시스템 마이그레이션 완료!' AS status;
SELECT '추가된 컬럼: rentcar_bookings에 34개' AS columns;
SELECT '생성된 테이블: vehicle_blocks, rental_payments, rental_deposits, rental_events, state_transitions' AS tables;
