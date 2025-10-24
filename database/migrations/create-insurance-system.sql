-- 렌트카 보험 시스템
-- Date: 2025-10-24

-- 1. 보험 상품 테이블
CREATE TABLE IF NOT EXISTS rentcar_insurance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id BIGINT NOT NULL COMMENT '업체 ID',

    -- 보험 정보
    name VARCHAR(100) NOT NULL COMMENT '보험 상품명',
    description TEXT COMMENT '보험 설명',
    coverage_details TEXT COMMENT '보장 내역',

    -- 요금 (시간당)
    hourly_rate_krw INT NOT NULL COMMENT '시간당 보험료',

    -- 상태
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
    display_order INT DEFAULT 0 COMMENT '표시 순서',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id) ON DELETE CASCADE,
    INDEX idx_vendor_active (vendor_id, is_active),
    INDEX idx_display_order (display_order)
) COMMENT='렌트카 보험 상품';

-- 2. 예약 테이블에 보험 관련 컬럼 추가
ALTER TABLE rentcar_bookings
ADD COLUMN insurance_id BIGINT NULL COMMENT '선택한 보험 ID' AFTER total_krw,
ADD COLUMN insurance_fee_krw INT DEFAULT 0 COMMENT '보험료' AFTER insurance_id,
ADD CONSTRAINT fk_booking_insurance FOREIGN KEY (insurance_id) REFERENCES rentcar_insurance(id) ON DELETE SET NULL;

-- 3. 샘플 보험 데이터 (vendor_id=1 기준)
INSERT INTO rentcar_insurance (vendor_id, name, description, coverage_details, hourly_rate_krw, display_order) VALUES
(1, '기본 자차보험', '기본적인 자차 손해를 보장합니다', '자차 손해 최대 500만원 보장\n면책금: 50만원', 1000, 1),
(1, '완전 자차보험', '면책금 없이 모든 자차 손해를 보장합니다', '자차 손해 전액 보장\n면책금: 0원\n대인/대물 무제한', 2000, 2),
(1, '슈퍼 보험', '모든 사고를 완벽하게 보장합니다', '자차 손해 전액 보장\n면책금: 0원\n대인/대물 무제한\n휴차 보상 포함', 3500, 3);

-- 4. 인덱스 추가
CREATE INDEX idx_booking_insurance ON rentcar_bookings(insurance_id);
