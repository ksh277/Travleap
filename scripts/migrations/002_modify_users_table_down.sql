-- ========================================
-- 마이그레이션: 002 - users 테이블 수정 롤백 (DOWN)
-- ========================================
-- 실행 순서: 추가된 요소의 역순으로 삭제
-- ========================================

-- 롤백 시 주의사항:
-- 1. Kakao OAuth로 가입한 사용자는 password_hash가 NULL입니다
-- 2. 롤백 시 해당 사용자들이 삭제됩니다
-- 3. total_points 데이터가 영구 삭제됩니다
-- 4. 프로덕션에서는 반드시 백업 후 실행하세요

-- ========================================
-- Step 1: 인덱스 삭제
-- ========================================
DROP INDEX idx_users_auth_provider ON users;

-- ========================================
-- Step 2: 컬럼 삭제
-- ========================================

-- total_points 컬럼 삭제 (포인트 데이터 손실)
ALTER TABLE users DROP COLUMN total_points;

-- auth_provider 컬럼 삭제
ALTER TABLE users DROP COLUMN auth_provider;

-- ========================================
-- Step 3: password_hash NOT NULL 복원
-- ========================================

-- 주의: Kakao 사용자 삭제 (password_hash가 NULL인 사용자)
-- 프로덕션에서는 이 단계 실행 전 확인 필수!
DELETE FROM users WHERE password_hash IS NULL;

-- password_hash를 다시 NOT NULL로 변경
ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NOT NULL;

-- ========================================
-- 롤백 완료
-- ========================================
-- 삭제된 컬럼:
-- - auth_provider
-- - total_points
--
-- 복원된 컬럼:
-- - password_hash: NOT NULL 제약조건 복원
--
-- 삭제된 인덱스:
-- - idx_users_auth_provider
--
-- ⚠️ 데이터 손실:
-- - Kakao OAuth 사용자 전체 삭제됨
-- - 모든 포인트 데이터 삭제됨
-- ========================================
