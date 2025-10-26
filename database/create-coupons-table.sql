-- 쿠폰 시스템 테이블
-- 하드코딩된 쿠폰을 DB 기반으로 전환

CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT '쿠폰 코드 (예: WELCOME10)',
  discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage' COMMENT '할인 타입',
  discount_value INT NOT NULL COMMENT '할인 값 (percentage면 %, fixed면 원)',
  min_amount INT DEFAULT 0 COMMENT '최소 주문 금액',
  max_discount INT DEFAULT NULL COMMENT '최대 할인 금액 (percentage 타입일 때)',
  description VARCHAR(255) COMMENT '쿠폰 설명',
  expires_at DATETIME DEFAULT NULL COMMENT '만료 일시 (NULL이면 무제한)',
  usage_limit INT DEFAULT NULL COMMENT '사용 가능 횟수 (NULL이면 무제한)',
  used_count INT DEFAULT 0 COMMENT '현재 사용된 횟수',
  is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
  category_restriction JSON DEFAULT NULL COMMENT '카테고리 제한 (예: ["팝업", "여행"])',
  user_restriction JSON DEFAULT NULL COMMENT '사용자 제한 (user_id 배열)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_active_expires (is_active, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='쿠폰 관리 테이블';

-- 쿠폰 사용 기록 테이블 (선택사항)
CREATE TABLE IF NOT EXISTS coupon_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coupon_code VARCHAR(50) NOT NULL,
  user_id INT DEFAULT NULL,
  order_id INT DEFAULT NULL,
  booking_id INT DEFAULT NULL,
  discount_amount INT NOT NULL COMMENT '실제 할인 금액',
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_coupon_code (coupon_code),
  INDEX idx_user_id (user_id),
  INDEX idx_order_id (order_id),
  FOREIGN KEY (coupon_code) REFERENCES coupons(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='쿠폰 사용 기록';

-- 기본 쿠폰 데이터 삽입 (기존 하드코딩 데이터 마이그레이션)
INSERT INTO coupons (
  code, discount_type, discount_value, min_amount, max_discount,
  description, expires_at, usage_limit, is_active
) VALUES
  (
    'WELCOME10',
    'percentage',
    10,
    100000,
    NULL,
    '첫 방문 10% 할인',
    '2025-12-31 23:59:59',
    NULL,
    TRUE
  ),
  (
    'PARTNER20',
    'percentage',
    20,
    200000,
    NULL,
    '파트너 전용 20% 할인',
    '2025-12-31 23:59:59',
    NULL,
    TRUE
  ),
  (
    'SINAN5000',
    'fixed',
    5000,
    50000,
    NULL,
    '신안 여행 5천원 할인',
    '2025-12-31 23:59:59',
    NULL,
    TRUE
  ),
  (
    'SUMMER30',
    'percentage',
    30,
    300000,
    50000,
    '여름 휴가 30% 대할인',
    '2025-08-31 23:59:59',
    100,
    TRUE
  ),
  (
    'FIRST15',
    'percentage',
    15,
    50000,
    NULL,
    '첫 구매 15% 할인',
    '2025-12-31 23:59:59',
    NULL,
    TRUE
  ),
  -- 추가 쿠폰 예시
  (
    'POPUP1000',
    'fixed',
    1000,
    10000,
    NULL,
    '팝업 스토어 전용 1천원 할인',
    '2025-12-31 23:59:59',
    NULL,
    TRUE
  )
ON DUPLICATE KEY UPDATE
  discount_value = VALUES(discount_value),
  min_amount = VALUES(min_amount),
  description = VALUES(description),
  expires_at = VALUES(expires_at),
  is_active = VALUES(is_active);

-- 쿠폰 통계 뷰 (관리자용)
CREATE OR REPLACE VIEW coupon_stats AS
SELECT
  c.code,
  c.description,
  c.discount_type,
  c.discount_value,
  c.used_count,
  c.usage_limit,
  CASE
    WHEN c.usage_limit IS NULL THEN '무제한'
    ELSE CONCAT(ROUND((c.used_count / c.usage_limit) * 100, 1), '%')
  END AS usage_rate,
  c.expires_at,
  CASE
    WHEN c.expires_at IS NULL THEN '만료 없음'
    WHEN c.expires_at < NOW() THEN '만료됨'
    ELSE CONCAT(DATEDIFF(c.expires_at, NOW()), '일 남음')
  END AS expiry_status,
  c.is_active,
  COALESCE(SUM(cu.discount_amount), 0) AS total_discount_given
FROM coupons c
LEFT JOIN coupon_usage cu ON c.code = cu.coupon_code
GROUP BY c.id, c.code, c.description, c.discount_type, c.discount_value,
         c.used_count, c.usage_limit, c.expires_at, c.is_active;
