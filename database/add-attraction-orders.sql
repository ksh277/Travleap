-- ============================================
-- 관광지 주문 테이블 추가
-- ============================================

CREATE TABLE IF NOT EXISTS attraction_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  -- 주문 정보
  order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '주문 번호 (예: ATR20250115ABC123)',

  -- 관계
  attraction_id INT NOT NULL COMMENT '관광지 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID',

  -- 방문 정보
  visit_date DATE NOT NULL COMMENT '방문 날짜',

  -- 티켓 정보
  tickets JSON NOT NULL COMMENT '[{"type":"adult","type_name":"성인","count":2,"unit_price":10000,"subtotal":20000}]',

  -- 금액
  total_amount INT NOT NULL COMMENT '총 금액',

  -- 결제 정보
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' COMMENT '결제 상태',
  payment_key VARCHAR(200) COMMENT 'Toss 결제 키',
  payment_method VARCHAR(50) COMMENT '결제 수단',
  paid_at TIMESTAMP NULL COMMENT '결제 완료 시각',

  -- 주문 상태
  order_status ENUM('pending', 'confirmed', 'completed', 'canceled') DEFAULT 'pending' COMMENT '주문 상태',

  -- 취소/환불
  canceled_at TIMESTAMP NULL COMMENT '취소 시각',
  cancel_reason TEXT COMMENT '취소 사유',
  refunded_at TIMESTAMP NULL COMMENT '환불 시각',
  refund_amount INT COMMENT '환불 금액',

  -- 메타데이터
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_attraction_id (attraction_id),
  INDEX idx_user_id (user_id),
  INDEX idx_order_number (order_number),
  INDEX idx_visit_date (visit_date),
  INDEX idx_payment_status (payment_status),
  INDEX idx_order_status (order_status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='관광지 티켓 주문';

-- ============================================
-- 사용 예시
-- ============================================

-- 1. 주문 생성
INSERT INTO attraction_orders (
  order_number,
  attraction_id,
  user_id,
  visit_date,
  tickets,
  total_amount,
  payment_status,
  order_status
) VALUES (
  'ATR20250115ABC123',
  1,
  123,
  '2025-01-20',
  '[{"type":"adult","type_name":"성인","count":2,"unit_price":10000,"subtotal":20000},{"type":"child","type_name":"어린이","count":1,"unit_price":5000,"subtotal":5000}]',
  25000,
  'pending',
  'pending'
);

-- 2. 주문 조회 (사용자별)
SELECT
  ao.*,
  a.name as attraction_name,
  a.address as attraction_address
FROM attraction_orders ao
JOIN attractions a ON ao.attraction_id = a.id
WHERE ao.user_id = 123
ORDER BY ao.created_at DESC;

-- 3. 결제 완료 처리
UPDATE attraction_orders
SET
  payment_status = 'paid',
  payment_key = 'test_payment_key_123',
  payment_method = 'card',
  paid_at = NOW(),
  order_status = 'confirmed'
WHERE order_number = 'ATR20250115ABC123';

-- ============================================
-- 완료
-- ============================================
SELECT '관광지 주문 테이블 추가 완료' AS status;
