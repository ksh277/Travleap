-- ===============================================
-- 렌트카 예약 상태명 전면 통일
-- ===============================================
-- 변경사항:
-- - in_progress → picked_up (체크인 완료, 차량 픽업)
-- - cancelled → canceled (철자 통일)
-- - returned 추가 (반납 완료, 체크아웃 전)
--
-- 최종 플로우:
-- pending → confirmed → picked_up → returned → completed
-- (취소: pending|confirmed → canceled)
-- ===============================================

-- Step 1: 기존 데이터 백업 (선택사항)
-- CREATE TABLE rentcar_bookings_backup AS SELECT * FROM rentcar_bookings;

-- Step 2: 임시 컬럼 추가
ALTER TABLE rentcar_bookings
ADD COLUMN status_new ENUM('pending', 'confirmed', 'picked_up', 'returned', 'completed', 'canceled') DEFAULT 'pending';

-- Step 3: 기존 데이터 마이그레이션
UPDATE rentcar_bookings
SET status_new = CASE
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'confirmed' THEN 'confirmed'
    WHEN status = 'in_progress' THEN 'picked_up'
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'cancelled' THEN 'canceled'
    ELSE 'pending'
END;

-- Step 4: 기존 컬럼 삭제
ALTER TABLE rentcar_bookings DROP COLUMN status;

-- Step 5: 새 컬럼 이름 변경
ALTER TABLE rentcar_bookings CHANGE status_new status
ENUM('pending', 'confirmed', 'picked_up', 'returned', 'completed', 'canceled')
DEFAULT 'pending' NOT NULL;

-- Step 6: 인덱스 재생성 (필요 시)
-- ALTER TABLE rentcar_bookings DROP INDEX idx_status;
-- CREATE INDEX idx_status ON rentcar_bookings(status, payment_status);

-- ===============================================
-- rentcar_state_transitions 테이블도 업데이트
-- ===============================================

-- from_status, to_status 컬럼 수정
ALTER TABLE rentcar_state_transitions
MODIFY COLUMN from_status ENUM('pending', 'confirmed', 'picked_up', 'returned', 'completed', 'canceled');

ALTER TABLE rentcar_state_transitions
MODIFY COLUMN to_status ENUM('pending', 'confirmed', 'picked_up', 'returned', 'completed', 'canceled');

-- 기존 데이터 업데이트
UPDATE rentcar_state_transitions
SET from_status = 'picked_up'
WHERE from_status = 'in_progress';

UPDATE rentcar_state_transitions
SET to_status = 'picked_up'
WHERE to_status = 'in_progress';

UPDATE rentcar_state_transitions
SET from_status = 'canceled'
WHERE from_status = 'cancelled';

UPDATE rentcar_state_transitions
SET to_status = 'canceled'
WHERE to_status = 'cancelled';

-- ===============================================
-- 확인 쿼리
-- ===============================================

-- 상태별 예약 개수 확인
SELECT status, COUNT(*) as count
FROM rentcar_bookings
GROUP BY status
ORDER BY FIELD(status, 'pending', 'confirmed', 'picked_up', 'returned', 'completed', 'canceled');

-- 최근 상태 전이 확인
SELECT *
FROM rentcar_state_transitions
ORDER BY created_at DESC
LIMIT 10;
