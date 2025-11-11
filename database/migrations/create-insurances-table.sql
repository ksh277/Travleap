-- 보험 관리 테이블 생성
-- 렌트카, 숙박, 투어 등 모든 서비스의 보험 상품 통합 관리

CREATE TABLE IF NOT EXISTS insurances (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- 기본 정보
  name VARCHAR(255) NOT NULL COMMENT '보험 상품명',
  category VARCHAR(50) NOT NULL COMMENT '보험 카테고리 (rentcar, accommodation, tour 등)',

  -- 가격 정보
  price DECIMAL(10, 2) NOT NULL COMMENT '보험료',
  pricing_unit ENUM('fixed', 'hourly', 'daily') NOT NULL DEFAULT 'daily' COMMENT '가격 단위',
  coverage_amount DECIMAL(12, 2) DEFAULT 0 COMMENT '보상 한도액',

  -- 연결 정보
  vendor_id INT NULL COMMENT '벤더 ID (특정 벤더 전용 보험인 경우)',
  vehicle_id INT NULL COMMENT '차량 ID (특정 차량 전용 보험인 경우)',

  -- 상세 정보
  description TEXT NULL COMMENT '보험 설명',
  coverage_details JSON NULL COMMENT '보장 항목 및 제외 항목 상세 (JSON)',

  -- 상태
  is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 인덱스
  INDEX idx_category (category),
  INDEX idx_vendor (vendor_id),
  INDEX idx_vehicle (vehicle_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='통합 보험 상품 관리';
