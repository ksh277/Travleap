-- ========================================
-- partners 테이블에 cancellation_rules 컬럼 추가
-- ========================================
-- 목적: 파트너(벤더)별 개별 환불 정책 설정 지원
-- 날짜: 2025-11-28
-- ========================================

-- 1. cancellation_rules JSON 컬럼 추가
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS cancellation_rules JSON NULL
COMMENT '환불 정책 규칙 (JSON: rules 배열, rentcar_vendors와 동일 형식 지원)';

-- 예시 JSON 구조:
-- {
--   "rules": [
--     {"days_before": 7, "fee_rate": 0, "description": "7일 전 무료 취소"},
--     {"days_before": 3, "fee_rate": 0.2, "description": "3일 전 20% 수수료"},
--     {"days_before": 1, "fee_rate": 0.5, "description": "1일 전 50% 수수료"},
--     {"days_before": 0, "fee_rate": 1, "description": "당일 환불 불가"}
--   ],
--   "is_refundable": true,
--   "notes": ["특별 안내 사항 등"]
-- }

-- 2. 인덱스 추가 (JSON 컬럼은 인덱스 불가하므로 스킵)

-- 3. 확인 쿼리
-- SELECT id, company_name, cancellation_rules FROM partners LIMIT 5;

-- ========================================
-- 참고: rentcar_vendors의 cancellation_rules 구조
-- ========================================
-- rentcar_vendors는 단순 구조 사용:
-- {
--   "3_days_before": 100,    -- 3일 전: 100% 환불
--   "1_2_days_before": 50,   -- 1-2일 전: 50% 환불
--   "same_day": 0            -- 당일: 0% 환불
-- }
--
-- partners는 더 유연한 구조 지원:
-- refund_policies 테이블과 동일한 rules 배열 형식
-- ========================================
