-- ========================================
-- 환불 정책 테이블
-- ========================================
-- 목적: 상품별/카테고리별 환불 정책을 유연하게 설정
-- 날짜: 2025-10-26
-- ========================================

CREATE TABLE IF NOT EXISTS refund_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- 정책 적용 범위
  listing_id INT NULL COMMENT '상품 ID (NULL이면 전체 또는 카테고리별)',
  category VARCHAR(50) NULL COMMENT '카테고리 (NULL이면 특정 상품만)',
  vendor_id INT NULL COMMENT '벤더 ID (벤더별 정책 가능)',

  -- 정책 이름
  policy_name VARCHAR(100) NOT NULL COMMENT '정책 이름 (예: "팝업굿즈 표준 정책")',

  -- 환불 가능 여부
  is_refundable BOOLEAN DEFAULT TRUE COMMENT '환불 가능 여부',
  refund_disabled_reason TEXT COMMENT '환불 불가 사유 (is_refundable=false일 때)',

  -- 환불 수수료 정책 (JSON)
  refund_policy_json JSON COMMENT '일수별 수수료 정책',
  -- 예시:
  -- {
  --   "rules": [
  --     {"days_before": 10, "fee_rate": 0, "description": "10일 전 무료 취소"},
  --     {"days_before": 7, "fee_rate": 0.1, "description": "7일 전 10% 수수료"},
  --     {"days_before": 3, "fee_rate": 0.2, "description": "3일 전 20% 수수료"},
  --     {"days_before": 1, "fee_rate": 0.3, "description": "1일 전 30% 수수료"},
  --     {"days_before": 0, "fee_rate": 0.5, "description": "당일 50% 수수료"}
  --   ],
  --   "past_booking_refundable": false
  -- }

  -- 특수 조건
  min_refund_amount INT DEFAULT 0 COMMENT '최소 환불 금액 (원)',
  max_refund_days INT DEFAULT 365 COMMENT '구매 후 최대 환불 가능 일수',

  -- 자동 승인 여부
  auto_approve BOOLEAN DEFAULT FALSE COMMENT '자동 환불 승인 여부',

  -- 우선순위 (높을수록 우선 적용)
  priority INT DEFAULT 0 COMMENT '우선순위 (1=낮음, 10=높음)',

  -- 활성화
  is_active BOOLEAN DEFAULT TRUE COMMENT '정책 활성화 여부',

  -- 메타 정보
  created_by INT COMMENT '생성자 (admin 또는 vendor)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 인덱스
  INDEX idx_listing_id (listing_id),
  INDEX idx_category (category),
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_is_active (is_active),

  -- 외래키
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='상품별/카테고리별 환불 정책';

-- ========================================
-- 기본 정책 삽입
-- ========================================

-- 1. 전체 기본 정책 (여행업 표준약관 기준)
INSERT INTO refund_policies (
  policy_name,
  is_refundable,
  refund_policy_json,
  priority,
  is_active,
  created_by
) VALUES (
  '여행상품 표준 환불정책',
  TRUE,
  JSON_OBJECT(
    'rules', JSON_ARRAY(
      JSON_OBJECT('days_before', 10, 'fee_rate', 0, 'description', '10일 전 무료 취소'),
      JSON_OBJECT('days_before', 7, 'fee_rate', 0.1, 'description', '9~7일 전 10% 수수료'),
      JSON_OBJECT('days_before', 3, 'fee_rate', 0.2, 'description', '6~3일 전 20% 수수료'),
      JSON_OBJECT('days_before', 1, 'fee_rate', 0.3, 'description', '2~1일 전 30% 수수료'),
      JSON_OBJECT('days_before', 0, 'fee_rate', 0.5, 'description', '당일 50% 수수료')
    ),
    'past_booking_refundable', FALSE
  ),
  1,  -- 가장 낮은 우선순위 (fallback)
  TRUE,
  1   -- admin
);

-- 2. 팝업 상품 정책 (환불 기간 짧음)
INSERT INTO refund_policies (
  category,
  policy_name,
  is_refundable,
  refund_policy_json,
  priority,
  is_active,
  created_by
) VALUES (
  '팝업',
  '팝업 굿즈 환불정책',
  TRUE,
  JSON_OBJECT(
    'rules', JSON_ARRAY(
      JSON_OBJECT('days_before', 3, 'fee_rate', 0, 'description', '3일 전 무료 취소'),
      JSON_OBJECT('days_before', 1, 'fee_rate', 0.2, 'description', '2~1일 전 20% 수수료'),
      JSON_OBJECT('days_before', 0, 'fee_rate', 0.5, 'description', '당일 50% 수수료')
    ),
    'past_booking_refundable', FALSE
  ),
  5,  -- 카테고리 정책 우선순위
  TRUE,
  1
);

-- 3. 환불 불가 상품 예시
INSERT INTO refund_policies (
  category,
  policy_name,
  is_refundable,
  refund_disabled_reason,
  priority,
  is_active,
  created_by
) VALUES (
  '투어',
  '현장 투어 환불 불가',
  FALSE,
  '현장에서 즉시 진행되는 투어 프로그램은 환불이 불가능합니다.',
  10,  -- 가장 높은 우선순위
  FALSE, -- 기본적으로 비활성화 (필요 시 활성화)
  1
);

-- ========================================
-- 정책 조회 함수 (참고용 SQL)
-- ========================================

-- 특정 상품의 환불 정책 조회 (우선순위 순)
-- SELECT * FROM refund_policies
-- WHERE (listing_id = ? OR category = ? OR listing_id IS NULL)
--   AND is_active = TRUE
-- ORDER BY priority DESC, id DESC
-- LIMIT 1;
