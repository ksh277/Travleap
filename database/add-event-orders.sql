-- ============================================
-- 행사 주문 테이블 추가
-- ============================================

CREATE TABLE IF NOT EXISTS event_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  -- 주문 정보
  order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '주문 번호 (예: EVT20250115ABC123)',

  -- 관계
  event_id INT NOT NULL COMMENT '행사 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID',

  -- 티켓 정보
  ticket_type VARCHAR(50) NOT NULL COMMENT 'general (일반석) or vip (VIP석)',
  quantity INT NOT NULL COMMENT '티켓 수량',
  unit_price INT NOT NULL COMMENT '단가',
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

  INDEX idx_event_id (event_id),
  INDEX idx_user_id (user_id),
  INDEX idx_order_number (order_number),
  INDEX idx_payment_status (payment_status),
  INDEX idx_order_status (order_status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='행사 티켓 주문';

-- ============================================
-- 사용 예시
-- ============================================

-- 1. 주문 생성
INSERT INTO event_orders (
  order_number,
  event_id,
  user_id,
  ticket_type,
  quantity,
  unit_price,
  total_amount,
  payment_status,
  order_status
) VALUES (
  'EVT20250115ABC123',
  1,
  123,
  'general',
  2,
  50000,
  100000,
  'pending',
  'pending'
);

-- 2. 주문 조회 (사용자별)
SELECT
  eo.*,
  e.title as event_title,
  e.venue_name,
  e.start_datetime
FROM event_orders eo
JOIN events e ON eo.event_id = e.id
WHERE eo.user_id = 123
ORDER BY eo.created_at DESC;

-- 3. 결제 완료 처리
UPDATE event_orders
SET
  payment_status = 'paid',
  payment_key = 'test_payment_key_123',
  payment_method = 'card',
  paid_at = NOW(),
  order_status = 'confirmed'
WHERE order_number = 'EVT20250115ABC123';

-- 4. 티켓 재고 증가 (주문 시 감소시킨 것 복구)
UPDATE events
SET tickets_remaining = tickets_remaining + 2
WHERE id = 1;

-- ============================================
-- 완료
-- ============================================
SELECT '행사 주문 테이블 추가 완료' AS status;
