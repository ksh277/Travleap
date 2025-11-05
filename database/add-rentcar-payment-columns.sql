-- ============================================
-- 렌트카 예약 테이블에 결제 정보 추가
-- ============================================
-- 문제: rentcar_bookings 테이블에 payment_key가 없어 Toss 결제 연동 불가
-- 해결: payment_key, paid_at 컬럼 추가
-- ============================================

-- 결제 정보 컬럼 추가
ALTER TABLE rentcar_bookings
ADD COLUMN payment_key VARCHAR(200) COMMENT 'Toss 결제 키',
ADD COLUMN paid_at TIMESTAMP NULL COMMENT '결제 완료 시각',
ADD INDEX idx_payment_key (payment_key);

-- 환불 정보 컬럼 추가 (없는 경우)
ALTER TABLE rentcar_bookings
ADD COLUMN refunded_at TIMESTAMP NULL COMMENT '환불 완료 시각',
ADD COLUMN refund_amount INT COMMENT '환불 금액',
ADD COLUMN cancel_reason TEXT COMMENT '취소/환불 사유';

-- 확인: rentcar_bookings 테이블 구조 출력
DESCRIBE rentcar_bookings;

-- ============================================
-- 완료
-- ============================================
SELECT '렌트카 결제 컬럼 추가 완료' AS status;
