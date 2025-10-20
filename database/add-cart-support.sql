-- 모든 상품에 장바구니 담기 기능 추가

-- 1. listings 테이블에 장바구니 관련 컬럼 추가
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS cart_enabled BOOLEAN DEFAULT true COMMENT '장바구니 담기 가능 여부',
ADD COLUMN IF NOT EXISTS instant_booking BOOLEAN DEFAULT false COMMENT '즉시 예약 가능 여부',
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false COMMENT '예약 승인 필요 여부',
ADD COLUMN IF NOT EXISTS booking_type ENUM('instant', 'inquiry', 'request') DEFAULT 'instant' COMMENT '예약 방식',
ADD COLUMN IF NOT EXISTS cancellation_policy VARCHAR(50) DEFAULT 'flexible' COMMENT '취소 정책';

-- 2. 기존 모든 상품을 장바구니 담기 가능하도록 설정
UPDATE listings
SET
  cart_enabled = true,
  instant_booking = true,
  booking_type = 'instant',
  cancellation_policy = 'flexible'
WHERE cart_enabled IS NULL OR cart_enabled = false;

-- 3. 카테고리별로 기본 설정 조정
UPDATE listings
SET
  requires_approval = true,
  booking_type = 'request'
WHERE category_id IN (SELECT id FROM categories WHERE slug = 'rentcar');

-- 4. 결과 확인
SELECT
  c.name as category,
  COUNT(*) as total,
  SUM(CASE WHEN l.cart_enabled = true THEN 1 ELSE 0 END) as cart_enabled_count,
  SUM(CASE WHEN l.instant_booking = true THEN 1 ELSE 0 END) as instant_booking_count
FROM listings l
LEFT JOIN categories c ON l.category_id = c.id
WHERE l.is_published = true AND l.is_active = true
GROUP BY c.name
ORDER BY total DESC;
