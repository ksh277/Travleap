-- Fix booking management: Add missing ENUM values and refund columns
-- Date: 2025-10-24

-- 1. Add 'deleted' to status ENUM
ALTER TABLE rentcar_bookings
MODIFY COLUMN status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'deleted') DEFAULT 'pending';

-- 2. Add refund tracking columns
ALTER TABLE rentcar_bookings
ADD COLUMN refund_amount_krw INT NULL COMMENT '환불 금액' AFTER total_krw,
ADD COLUMN refund_reason TEXT NULL COMMENT '환불 사유' AFTER refund_amount_krw,
ADD COLUMN refunded_at TIMESTAMP NULL COMMENT '환불 처리 시각' AFTER refund_reason;

-- 3. Add index for refund tracking
ALTER TABLE rentcar_bookings
ADD INDEX idx_refunded (payment_status, refunded_at);

-- Verify changes
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'rentcar_bookings'
AND TABLE_SCHEMA = DATABASE()
AND (COLUMN_NAME LIKE 'refund%' OR COLUMN_NAME IN ('status', 'payment_status'))
ORDER BY ORDINAL_POSITION;
