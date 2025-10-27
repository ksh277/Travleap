-- 보험 필수 여부 컬럼 추가
ALTER TABLE rentcar_insurance
ADD COLUMN is_required BOOLEAN DEFAULT FALSE COMMENT '보험 필수 가입 여부 (true면 고객이 반드시 선택해야 함)';
