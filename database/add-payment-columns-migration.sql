-- ===============================================
-- payments 테이블 컬럼 추가 Migration
-- Toss Payments 연동을 위한 필수 컬럼 추가
-- ===============================================
-- 주의: 이미 존재하는 컬럼은 "Duplicate column" 에러가 발생하지만 무시하고 계속 진행됩니다.
-- ===============================================

-- 1. order_id (장바구니 주문 ID)
ALTER TABLE payments
ADD COLUMN order_id INT COMMENT '장바구니 주문 ID (ORDER_ prefix)';

-- 2. payment_key (Toss Payments 결제 키)
ALTER TABLE payments
ADD COLUMN payment_key VARCHAR(200) COMMENT 'Toss Payments 결제 키';

-- 3. order_id_str (주문 번호 문자열: ORDER_xxx 또는 BK-xxx)
ALTER TABLE payments
ADD COLUMN order_id_str VARCHAR(100) COMMENT '주문 번호 (ORDER_xxx or BK-xxx)';

-- 4. payment_status (결제 상태 - Toss Payments 상태값 저장)
ALTER TABLE payments
ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending' COMMENT '결제 상태 (DONE, CANCELED, PARTIAL_CANCELED 등)';

-- 5. approved_at (결제 승인 시각)
ALTER TABLE payments
ADD COLUMN approved_at DATETIME COMMENT '결제 승인 시각';

-- 6. receipt_url (영수증 URL)
ALTER TABLE payments
ADD COLUMN receipt_url VARCHAR(500) COMMENT 'Toss Payments 영수증 URL';

-- 7. card_company (카드사)
ALTER TABLE payments
ADD COLUMN card_company VARCHAR(50) COMMENT '카드사명';

-- 8. card_number (카드 번호 마스킹)
ALTER TABLE payments
ADD COLUMN card_number VARCHAR(50) COMMENT '카드 번호 (마스킹)';

-- 9. card_installment (할부 개월)
ALTER TABLE payments
ADD COLUMN card_installment INT DEFAULT 0 COMMENT '할부 개월수';

-- 10. virtual_account_number (가상계좌 번호)
ALTER TABLE payments
ADD COLUMN virtual_account_number VARCHAR(50) COMMENT '가상계좌 번호';

-- 11. virtual_account_bank (가상계좌 은행)
ALTER TABLE payments
ADD COLUMN virtual_account_bank VARCHAR(50) COMMENT '가상계좌 은행명';

-- 12. virtual_account_due_date (가상계좌 입금 마감일)
ALTER TABLE payments
ADD COLUMN virtual_account_due_date DATETIME COMMENT '가상계좌 입금 마감일';

-- 13. refund_amount (환불 금액)
ALTER TABLE payments
ADD COLUMN refund_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '환불 금액';

-- 14. refund_reason (환불 사유)
ALTER TABLE payments
ADD COLUMN refund_reason TEXT COMMENT '환불 사유';

-- 15. refunded_at (환불 처리 시각)
ALTER TABLE payments
ADD COLUMN refunded_at DATETIME COMMENT '환불 처리 시각';

-- booking_id를 NULL 허용으로 변경 (장바구니 주문은 booking_id가 없을 수 있음)
ALTER TABLE payments
MODIFY COLUMN booking_id INT NULL COMMENT '예약 ID (장바구니 주문은 NULL)';
