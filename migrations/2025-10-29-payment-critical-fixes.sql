-- =============================================================================
-- Migration: 결제 시스템 Critical 수정을 위한 DB 스키마 변경
-- Date: 2025-10-29
-- Version: 1.2.0
-- =============================================================================

-- 🚨 중요: PlanetScale에서는 한 번에 하나의 ALTER TABLE만 실행 가능
--         각 쿼리를 순서대로 하나씩 실행하세요!

-- =============================================================================
-- Step 1: bookings 테이블에 guests 컬럼 추가
-- =============================================================================
-- 목적: 재고 복구 시 정확한 수량을 사용하기 위함
-- 영향: 재고 복구 로직이 이 값을 사용
-- =============================================================================

ALTER TABLE bookings
ADD COLUMN guests INT DEFAULT 1 COMMENT 'Total guest count for stock management';

-- 실행 후 확인:
-- SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'bookings' AND COLUMN_NAME = 'guests';

-- =============================================================================
-- Step 2: bookings 테이블에 selected_option_id 컬럼 추가
-- =============================================================================
-- 목적: 결제 실패 시 옵션 재고를 복구하기 위함
-- 영향: handlePaymentFailure 함수가 이 값을 사용
-- =============================================================================

ALTER TABLE bookings
ADD COLUMN selected_option_id INT NULL COMMENT 'Product option ID for stock restoration';

-- 실행 후 확인:
-- SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'bookings' AND COLUMN_NAME = 'selected_option_id';

-- =============================================================================
-- Step 3: bookings.selected_option_id에 인덱스 추가
-- =============================================================================
-- 목적: 재고 복구 시 조회 성능 향상
-- =============================================================================

ALTER TABLE bookings
ADD INDEX idx_selected_option (selected_option_id);

-- 실행 후 확인:
-- SHOW INDEX FROM bookings WHERE Key_name = 'idx_selected_option';

-- =============================================================================
-- Step 4: payments 테이블에 payment_key 컬럼 추가 ⚠️ CRITICAL
-- =============================================================================
-- 목적: Idempotency 보호 - 동일 결제 중복 처리 방지
-- 영향: confirmPayment 함수가 이 값으로 중복 체크
-- =============================================================================

ALTER TABLE payments
ADD COLUMN payment_key VARCHAR(200) NULL COMMENT 'Toss Payments unique payment key';

-- 실행 후 확인:
-- SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_key';

-- =============================================================================
-- Step 5: payments.payment_key에 UNIQUE 인덱스 추가 ⚠️ CRITICAL
-- =============================================================================
-- 목적: payment_key 중복 방지 (DB 레벨 제약)
-- 영향: 동일 paymentKey로 두 번 처리 시 DB가 에러 발생
-- =============================================================================

ALTER TABLE payments
ADD UNIQUE INDEX idx_payment_key (payment_key);

-- 실행 후 확인:
-- SHOW INDEX FROM payments WHERE Key_name = 'idx_payment_key';

-- =============================================================================
-- Step 6: payments 테이블에 order_id_str 컬럼 추가 (선택사항)
-- =============================================================================
-- 목적: Toss API에서 받은 orderId 문자열 저장
-- =============================================================================

ALTER TABLE payments
ADD COLUMN order_id_str VARCHAR(100) NULL COMMENT 'Order ID string from Toss';

-- =============================================================================
-- Step 7: payments 테이블에 approved_at 컬럼 추가 (선택사항)
-- =============================================================================
-- 목적: Toss에서 결제 승인된 정확한 시간 기록
-- =============================================================================

ALTER TABLE payments
ADD COLUMN approved_at TIMESTAMP NULL COMMENT 'Payment approval timestamp from Toss';

-- =============================================================================
-- Step 8: payments 테이블에 receipt_url 컬럼 추가 (선택사항)
-- =============================================================================
-- 목적: Toss 영수증 URL 저장
-- =============================================================================

ALTER TABLE payments
ADD COLUMN receipt_url VARCHAR(500) NULL COMMENT 'Receipt URL from Toss';

-- =============================================================================
-- 검증 쿼리
-- =============================================================================

-- bookings 테이블 확인
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'bookings'
  AND COLUMN_NAME IN ('guests', 'selected_option_id', 'order_number')
ORDER BY ORDINAL_POSITION;

-- payments 테이블 확인
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payments'
  AND COLUMN_NAME IN ('payment_key', 'gateway_transaction_id', 'order_id_str', 'approved_at', 'receipt_url')
ORDER BY ORDINAL_POSITION;

-- 인덱스 확인
SHOW INDEX FROM bookings WHERE Key_name IN ('idx_selected_option', 'idx_order_number');
SHOW INDEX FROM payments WHERE Key_name IN ('idx_payment_key', 'idx_gateway_transaction_id');

-- =============================================================================
-- 주의사항
-- =============================================================================
/*
1. PlanetScale에서는 각 ALTER TABLE을 개별적으로 실행해야 합니다.
2. Step 1-5는 필수입니다. (특히 Step 4-5는 CRITICAL)
3. Step 6-8은 선택사항이지만 권장됩니다.
4. 각 단계 실행 후 "실행 후 확인" 쿼리로 성공 여부를 확인하세요.
5. migration 실행 전에 백업을 권장합니다.
6. 실행 순서를 반드시 지켜주세요.

우선순위:
- Step 1-3: bookings 테이블 (재고 복구 정확도)
- Step 4-5: payments.payment_key (중복 결제 방지) ⚠️ 최우선
- Step 6-8: 부가 정보 (선택사항)
*/
