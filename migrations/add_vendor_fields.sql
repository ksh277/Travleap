-- 렌트카 업체 테이블에 상세주소, 대여안내, 환불정책 구조화 필드 추가
-- 실행일: 2025-10-27

-- 1. 상세주소 추가
ALTER TABLE rentcar_vendors
ADD COLUMN address_detail VARCHAR(255) DEFAULT NULL COMMENT '상세주소' AFTER address;

-- 2. 대여 안내 추가 (업체가 직접 수정 가능)
ALTER TABLE rentcar_vendors
ADD COLUMN rental_guide TEXT DEFAULT NULL COMMENT '대여 안내사항 (운전면허, 연령제한 등)' AFTER cancellation_policy;

-- 3. 환불 정책 구조화 데이터 (JSON)
-- 예시: {"3days": 100, "1-2days": 50, "same_day": 0}
-- 뜻: 3일 전 100% 환불, 1-2일 전 50% 환불, 당일 0% 환불
ALTER TABLE rentcar_vendors
ADD COLUMN cancellation_rules JSON DEFAULT NULL COMMENT '환불 정책 비율 (JSON: {기간: 환불비율})' AFTER rental_guide;

-- 기본값 설정 (기존 업체용)
UPDATE rentcar_vendors
SET rental_guide = '• 운전면허 취득 1년 이상 필수
• 만 21세 이상 대여 가능
• 대여 시 신분증, 운전면허증, 신용카드 필요
• 보험 가입 필수 (기본 보험 포함)
• 주행거리 제한: 1일 200km (초과 시 km당 ₩100)'
WHERE rental_guide IS NULL;

UPDATE rentcar_vendors
SET cancellation_rules = JSON_OBJECT(
  '3_days_before', 100,
  '1_2_days_before', 50,
  'same_day', 0
)
WHERE cancellation_rules IS NULL;
