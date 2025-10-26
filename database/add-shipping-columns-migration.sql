-- ================================================================
-- 배송 정보 컬럼 추가 (PG사 심사 및 전자상거래법 대응)
-- ================================================================
-- 목적: 팝업 상품 판매형 카테고리에 대한 배송 정보 관리
-- 날짜: 2025-10-25
-- ================================================================

-- 1. shipping_name (수령인 이름)
ALTER TABLE bookings
ADD COLUMN shipping_name VARCHAR(100) COMMENT '수령인 이름';

-- 2. shipping_phone (수령인 전화번호)
ALTER TABLE bookings
ADD COLUMN shipping_phone VARCHAR(20) COMMENT '수령인 전화번호';

-- 3. shipping_address (기본 주소)
ALTER TABLE bookings
ADD COLUMN shipping_address VARCHAR(255) COMMENT '배송지 기본 주소';

-- 4. shipping_address_detail (상세 주소)
ALTER TABLE bookings
ADD COLUMN shipping_address_detail VARCHAR(255) COMMENT '배송지 상세 주소';

-- 5. shipping_zipcode (우편번호)
ALTER TABLE bookings
ADD COLUMN shipping_zipcode VARCHAR(10) COMMENT '우편번호';

-- 6. shipping_memo (배송 요청사항)
ALTER TABLE bookings
ADD COLUMN shipping_memo VARCHAR(255) COMMENT '배송 요청사항';

-- 7. tracking_number (송장번호)
ALTER TABLE bookings
ADD COLUMN tracking_number VARCHAR(50) COMMENT '택배 송장번호';

-- 8. courier_company (택배사)
ALTER TABLE bookings
ADD COLUMN courier_company VARCHAR(50) COMMENT '택배사명 (CJ대한통운, 우체국택배 등)';

-- 9. delivery_status (배송 상태)
ALTER TABLE bookings
ADD COLUMN delivery_status ENUM('PENDING', 'READY', 'SHIPPING', 'DELIVERED', 'CANCELED')
DEFAULT 'PENDING'
COMMENT '배송 상태: PENDING(결제대기), READY(배송준비), SHIPPING(배송중), DELIVERED(배송완료), CANCELED(취소)';

-- 10. shipped_at (발송 시각)
ALTER TABLE bookings
ADD COLUMN shipped_at DATETIME COMMENT '발송 처리 시각';

-- 11. delivered_at (배송 완료 시각)
ALTER TABLE bookings
ADD COLUMN delivered_at DATETIME COMMENT '배송 완료 시각';

-- ================================================================
-- 인덱스 추가 (성능 최적화)
-- ================================================================

-- 배송 상태별 조회 최적화
ALTER TABLE bookings
ADD INDEX idx_delivery_status (delivery_status, created_at);

-- 송장번호 조회 최적화
ALTER TABLE bookings
ADD INDEX idx_tracking_number (tracking_number);

-- 배송 완료 날짜별 조회 최적화
ALTER TABLE bookings
ADD INDEX idx_delivered_at (delivered_at);
