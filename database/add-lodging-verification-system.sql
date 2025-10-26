-- 숙박(Lodging) 검증 시스템 마이그레이션
-- 바우처, QR 코드, 체크인/체크아웃 검증 기능 추가

-- 1. lodging_bookings 테이블에 검증 컬럼 추가
ALTER TABLE lodging_bookings
  -- 바우처 및 QR 코드
  ADD COLUMN voucher_code VARCHAR(50) UNIQUE
    COMMENT '예약 확인 코드 (6자리 영숫자)',

  ADD COLUMN qr_code TEXT
    COMMENT 'QR 코드 데이터 (Base64 인코딩)',

  -- 체크인 정보
  ADD COLUMN checked_in_at TIMESTAMP NULL
    COMMENT '실제 체크인 완료 시각',

  ADD COLUMN checked_in_by VARCHAR(200)
    COMMENT '체크인 처리자 (프론트 데스크 직원)',

  ADD COLUMN room_condition_checkin JSON
    COMMENT '체크인 시 객실 상태 (청결도, 편의시설, 손상 여부)',

  -- 체크아웃 정보
  ADD COLUMN checked_out_at TIMESTAMP NULL
    COMMENT '실제 체크아웃 완료 시각',

  ADD COLUMN checked_out_by VARCHAR(200)
    COMMENT '체크아웃 처리자 (프론트 데스크 직원)',

  ADD COLUMN room_condition_checkout JSON
    COMMENT '체크아웃 시 객실 상태 (청결도, 손상, 미니바 소비)',

  -- 추가 요금
  ADD COLUMN minibar_charges JSON
    COMMENT '미니바 소비 내역 [{item, quantity, price}]',

  ADD COLUMN additional_charges_detail JSON
    COMMENT '추가 요금 상세 (손상, 레이트 체크아웃, 룸서비스 등)',

  ADD COLUMN total_additional_charges INT DEFAULT 0
    COMMENT '총 추가 요금 (원)',

  -- 바우처 사용 추적
  ADD COLUMN used_at TIMESTAMP NULL
    COMMENT '바우처 최초 사용 시각 (중복 사용 방지)',

  -- 취소 정책 연결
  ADD COLUMN cancellation_policy_id INT
    COMMENT '적용된 취소 정책 ID (lodging_policies.id)';

-- 2. 인덱스 추가 (조회 성능 최적화)
CREATE INDEX idx_voucher_code ON lodging_bookings(voucher_code);
CREATE INDEX idx_checked_in_at ON lodging_bookings(checked_in_at);
CREATE INDEX idx_checked_out_at ON lodging_bookings(checked_out_at);
CREATE INDEX idx_used_at ON lodging_bookings(used_at);
CREATE INDEX idx_cancellation_policy ON lodging_bookings(cancellation_policy_id);

-- 3. 취소 정책 테이블 업데이트 (존재하면 업데이트, 없으면 생성)
CREATE TABLE IF NOT EXISTS lodging_cancellation_policies (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  policy_name VARCHAR(100) NOT NULL
    COMMENT '정책 이름 (유연한 취소, 중간 취소, 엄격한 취소)',

  category VARCHAR(50) NOT NULL
    COMMENT '카테고리 (flexible, moderate, strict, non_refundable)',

  rules_json JSON NOT NULL
    COMMENT '환불 규칙 [{hours_before_checkin, refund_rate}]',

  no_show_penalty_rate INT DEFAULT 100
    COMMENT 'No-show 시 위약금 비율 (0-100%)',

  description TEXT
    COMMENT '정책 설명',

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_category (category),
  INDEX idx_active (is_active)
);

-- 4. 기본 취소 정책 데이터 삽입
INSERT INTO lodging_cancellation_policies (policy_name, category, rules_json, no_show_penalty_rate, description)
VALUES
  ('유연한 취소', 'flexible',
   '[{"hours_before_checkin": 24, "refund_rate": 100}, {"hours_before_checkin": 0, "refund_rate": 0}]',
   100,
   '체크인 24시간 전까지 무료 취소 가능. 이후 취소 시 환불 불가.'),

  ('중간 취소', 'moderate',
   '[{"hours_before_checkin": 72, "refund_rate": 100}, {"hours_before_checkin": 24, "refund_rate": 50}, {"hours_before_checkin": 0, "refund_rate": 0}]',
   100,
   '체크인 72시간 전: 100% 환불, 24시간 전: 50% 환불, 이후: 환불 불가.'),

  ('엄격한 취소', 'strict',
   '[{"hours_before_checkin": 168, "refund_rate": 100}, {"hours_before_checkin": 72, "refund_rate": 50}, {"hours_before_checkin": 0, "refund_rate": 0}]',
   100,
   '체크인 7일 전: 100% 환불, 3일 전: 50% 환불, 이후: 환불 불가.'),

  ('환불 불가', 'non_refundable',
   '[{"hours_before_checkin": 0, "refund_rate": 0}]',
   100,
   '예약 후 취소 시 환불 불가. No-show 시에도 100% 요금 부과.')
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 5. 체크인/체크아웃 히스토리 테이블 (선택 사항, 감사 로그용)
CREATE TABLE IF NOT EXISTS lodging_booking_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  booking_id INT NOT NULL
    COMMENT 'lodging_bookings.id 참조',

  action VARCHAR(50) NOT NULL
    COMMENT '액션 타입 (VOUCHER_GENERATED, VOUCHER_VERIFIED, CHECK_IN, CHECK_OUT)',

  details JSON
    COMMENT '액션 상세 정보',

  created_by VARCHAR(200)
    COMMENT '작업자 (이메일 또는 ID)',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_booking (booking_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
);

-- 6. Foreign Key 제약 조건 (PlanetScale에서는 스킵될 수 있음)
-- ALTER TABLE lodging_bookings
--   ADD CONSTRAINT fk_lodging_cancellation_policy
--   FOREIGN KEY (cancellation_policy_id)
--   REFERENCES lodging_cancellation_policies(id);

-- 완료 메시지
SELECT '✅ 숙박 검증 시스템 마이그레이션 완료!' AS status;
SELECT '추가된 컬럼: 12개 (voucher_code, qr_code, checked_in_at, checked_in_by, room_condition_checkin, checked_out_at, checked_out_by, room_condition_checkout, minibar_charges, additional_charges_detail, total_additional_charges, used_at, cancellation_policy_id)' AS columns_added;
SELECT '생성된 테이블: lodging_cancellation_policies, lodging_booking_history' AS tables_created;
