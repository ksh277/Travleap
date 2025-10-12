-- ============================================
-- Phase 7: Payment Integration
-- 결제 관련 테이블
-- ============================================

-- 결제 이력 테이블
CREATE TABLE payment_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT NOT NULL,
  payment_id VARCHAR(255) NOT NULL UNIQUE,
  order_id VARCHAR(255) NOT NULL,
  provider ENUM('toss', 'iamport', 'kakao', 'naver') NOT NULL,
  method ENUM('card', 'virtual_account', 'bank_transfer', 'mobile', 'kakao_pay', 'naver_pay', 'toss_pay') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'ready', 'approved', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
  approved_at TIMESTAMP NULL,
  cancel_reason TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_payment_booking (booking_id),
  INDEX idx_payment_id (payment_id),
  INDEX idx_payment_status (status),
  INDEX idx_payment_provider (provider),
  INDEX idx_payment_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 환불 이력 테이블
CREATE TABLE refund_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  payment_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  approved_by BIGINT,
  approved_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_refund_payment (payment_id),
  INDEX idx_refund_status (status),
  INDEX idx_refund_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 예약 테이블에 결제 상태 컬럼 추가
ALTER TABLE rentcar_bookings
ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' AFTER status;
