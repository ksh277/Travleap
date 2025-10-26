-- ===============================================
-- Webhook Idempotency Constraint Migration
-- 동일한 payment_key + event_type 중복 처리 방지
-- ===============================================

-- 1. payment_events 테이블에 UNIQUE 제약조건 추가
-- 기존 중복 데이터가 있으면 제거 후 실행

-- 1-1. 중복 데이터 제거 (가장 최근 데이터만 유지)
DELETE pe1 FROM payment_events pe1
INNER JOIN payment_events pe2
WHERE
  pe1.payment_key = pe2.payment_key
  AND pe1.event_type = pe2.event_type
  AND pe1.id < pe2.id;

-- 1-2. UNIQUE 제약조건 추가
ALTER TABLE payment_events
ADD CONSTRAINT uk_payment_event UNIQUE (payment_key, event_type);

-- 설명:
-- - payment_key + event_type 조합으로 중복 이벤트 차단
-- - 동시에 두 개의 동일한 이벤트가 들어와도 한 개만 성공
-- - 실패한 쪽은 ER_DUP_ENTRY 에러 발생 → 이미 처리됨으로 간주

-- 2. 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_event_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_created_at ON payment_events(created_at);

-- 완료
SELECT '✅ Webhook idempotency constraint added successfully' AS status;
