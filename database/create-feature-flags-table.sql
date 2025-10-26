/**
 * Feature Flags 테이블 생성
 *
 * 목적: 운영 중 코드 배포 없이 기능을 ON/OFF할 수 있는 기능 플래그 시스템
 *
 * 사용 예:
 * - 결제 시스템 긴급 차단
 * - 카테고리별 결제 제어
 * - A/B 테스트
 * - 점진적 기능 배포 (Gradual Rollout)
 *
 * 실행 방법:
 * PlanetScale 대시보드 > Branches > main > Console > SQL 탭에서 실행
 */

-- Feature Flags 테이블 생성
CREATE TABLE IF NOT EXISTS feature_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flag_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL COMMENT '플래그 설명',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '플래그 활성화 여부',
  disabled_message VARCHAR(255) NULL COMMENT '비활성화 시 사용자에게 보여줄 메시지',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_flag_name (flag_name),
  INDEX idx_is_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='기능 플래그 테이블 - 운영 중 기능 제어';

-- 초기 플래그 데이터 삽입
INSERT INTO feature_flags (flag_name, description, is_enabled, disabled_message) VALUES
-- 전역 결제 플래그
('payment_enabled', '전체 결제 시스템 활성화 여부', TRUE, NULL),

-- 카테고리별 결제 플래그
('popup_payment_enabled', '팝업 상품 결제 활성화 여부', TRUE, NULL),
('travel_payment_enabled', '여행 상품 결제 활성화 여부', TRUE, NULL),
('accommodation_payment_enabled', '숙박 상품 결제 활성화 여부', TRUE, NULL),
('rentcar_payment_enabled', '렌트카 결제 활성화 여부', TRUE, NULL),
('experience_payment_enabled', '체험 상품 결제 활성화 여부', TRUE, NULL),
('food_payment_enabled', '음식 상품 결제 활성화 여부', TRUE, NULL),
('event_payment_enabled', '행사 상품 결제 활성화 여부', TRUE, NULL),
('attraction_payment_enabled', '관광지 상품 결제 활성화 여부', TRUE, NULL),

-- 기능별 플래그
('cart_enabled', '장바구니 기능 활성화', TRUE, NULL),
('points_enabled', '포인트 시스템 활성화', TRUE, NULL),
('reviews_enabled', '리뷰 작성 기능 활성화', TRUE, NULL),
('vendor_registration_enabled', '벤더 회원가입 활성화', TRUE, NULL),

-- 비상 스위치
('maintenance_mode', '점검 모드 (모든 기능 차단)', FALSE, '시스템 점검 중입니다. 잠시 후 다시 시도해주세요.')

ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  -- is_enabled는 UPDATE하지 않음 (기존 설정 유지)
  updated_at = CURRENT_TIMESTAMP;

-- 테이블 생성 및 데이터 삽입 확인
SELECT
  id,
  flag_name,
  description,
  is_enabled,
  disabled_message,
  created_at
FROM feature_flags
ORDER BY id;
