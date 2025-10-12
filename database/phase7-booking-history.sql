-- ============================================
-- Phase 7: Booking State Machine
-- 예약 상태 변경 이력 테이블
-- ============================================

CREATE TABLE rentcar_booking_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT NOT NULL,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  reason TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_booking_history_booking_id (booking_id),
  INDEX idx_booking_history_created_at (created_at),
  INDEX idx_booking_history_booking_status (booking_id, to_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 취소 수수료 컬럼 추가 (예약 테이블)
ALTER TABLE rentcar_bookings
ADD COLUMN cancellation_fee_krw DECIMAL(10,2) DEFAULT 0 AFTER discount_krw;

-- 상태 컬럼에 새로운 상태 추가
ALTER TABLE rentcar_bookings
MODIFY COLUMN status ENUM(
  'pending',
  'confirmed',
  'picked_up',
  'in_use',
  'returned',
  'completed',
  'cancelled',
  'no_show',
  'refunded'
) DEFAULT 'pending';
