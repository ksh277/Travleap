-- ============================================
-- 팝업스토어 재고 관리 시스템 추가
-- ============================================

-- listings 테이블에 재고 관리 필드 추가
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS stock INT DEFAULT NULL COMMENT '재고 수량 (NULL = 무제한)',
ADD COLUMN IF NOT EXISTS stock_enabled TINYINT(1) DEFAULT 0 COMMENT '재고 관리 활성화 (0=비활성, 1=활성)',
ADD INDEX idx_stock_enabled (stock_enabled, stock);

-- product_options 테이블에 재고 필드 추가 (옵션별 재고)
ALTER TABLE product_options
ADD COLUMN IF NOT EXISTS stock INT DEFAULT NULL COMMENT '옵션 재고 수량 (NULL = 무제한)',
ADD INDEX idx_option_stock (stock);

-- ============================================
-- 사용 예시
-- ============================================

-- 1. 재고 없는 상품 (무제한 판매)
UPDATE listings SET stock_enabled = 0, stock = NULL WHERE id = 1;

-- 2. 재고 있는 상품 (100개 보유)
UPDATE listings SET stock_enabled = 1, stock = 100 WHERE id = 2;

-- 3. 옵션별 재고 관리
UPDATE product_options SET stock = 50 WHERE id = 1; -- "빨강" 옵션 50개
UPDATE product_options SET stock = 30 WHERE id = 2; -- "파랑" 옵션 30개

-- ============================================
-- 완료
-- ============================================
SELECT '팝업스토어 재고 관리 시스템 추가 완료' AS status;
