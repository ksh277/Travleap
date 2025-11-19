-- ========================================
-- 마이그레이션: 002 - users 테이블 수정 (UP)
-- ========================================
-- 목적: 스마트 쿠폰 시스템을 위한 users 테이블 확장
-- - Kakao OAuth 지원
-- - 포인트 시스템 지원
-- ========================================

-- Step 1: password_hash를 NULL 허용으로 변경
ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL
  COMMENT 'Kakao 로그인 사용자는 NULL 가능';

-- Step 2: auth_provider 컬럼 추가
ALTER TABLE users
  ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email'
  AFTER password_hash
  COMMENT '인증 제공자: email, kakao';

-- Step 3: total_points 컬럼 추가
ALTER TABLE users
  ADD COLUMN total_points INT DEFAULT 0
  AFTER role
  COMMENT '사용자 포인트 (리뷰 적립)';

-- Step 4: 인덱스 추가
CREATE INDEX idx_users_auth_provider ON users(auth_provider);

-- Step 5: 기존 데이터 마이그레이션
UPDATE users
SET auth_provider = 'email'
WHERE password_hash IS NOT NULL;

-- ========================================
-- 마이그레이션 완료
-- ========================================
-- 추가된 컬럼:
-- - auth_provider: 로그인 방식 구분 (email/kakao)
-- - total_points: 사용자 포인트 잔액
--
-- 수정된 컬럼:
-- - password_hash: NULL 허용 (Kakao 사용자 대응)
--
-- 추가된 인덱스:
-- - idx_users_auth_provider: 로그인 방식별 조회 최적화
-- ========================================
