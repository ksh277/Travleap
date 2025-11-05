-- ============================================
-- 투어 예약 테이블에 결제 정보 추가
-- ============================================
-- 문제: tour_bookings 테이블에 결제 관련 컬럼이 없어 결제/환불 처리 불가
-- 해결: payment_key, payment_method, paid_at 컬럼 추가
-- ============================================

-- 결제 정보 컬럼 추가
ALTER TABLE tour_bookings
ADD COLUMN payment_key VARCHAR(200) COMMENT 'Toss 결제 키',
ADD COLUMN payment_method VARCHAR(50) COMMENT '결제 수단 (card, bank_transfer, kakaopay, etc)',
ADD COLUMN paid_at TIMESTAMP NULL COMMENT '결제 완료 시각',
ADD INDEX idx_payment_key (payment_key);

-- 환불 정보 컬럼 추가 (기존에 없는 경우)
-- ALTER TABLE tour_bookings
-- ADD COLUMN refunded_at TIMESTAMP NULL COMMENT '환불 완료 시각',
-- ADD COLUMN refund_amount INT COMMENT '환불 금액',
-- ADD COLUMN cancel_reason TEXT COMMENT '취소 사유';

-- 확인: tour_bookings 테이블 구조 출력
DESCRIBE tour_bookings;

-- ============================================
-- 사용 예시
-- ============================================

-- 1. 결제 완료 처리
UPDATE tour_bookings
SET
  payment_status = 'paid',
  payment_key = 'test_payment_key_12345',
  payment_method = 'card',
  paid_at = NOW(),
  status = 'confirmed'
WHERE booking_number = 'TOUR20250115ABC123';

-- 2. 환불 처리 (payment_key로 조회)
SELECT
  tb.id,
  tb.booking_number,
  tb.total_amount,
  tb.payment_key,
  ts.title as tour_title
FROM tour_bookings tb
JOIN tour_schedules ts ON tb.schedule_id = ts.id
WHERE tb.payment_key = 'test_payment_key_12345';

-- 3. 결제 완료된 투어 예약 조회
SELECT
  tb.*,
  ts.title,
  tp.name as package_name
FROM tour_bookings tb
JOIN tour_schedules ts ON tb.schedule_id = ts.id
JOIN tour_packages tp ON ts.package_id = tp.id
WHERE tb.payment_status = 'paid'
ORDER BY tb.paid_at DESC
LIMIT 50;

-- ============================================
-- 완료
-- ============================================
SELECT '투어 결제 컬럼 추가 완료' AS status;
