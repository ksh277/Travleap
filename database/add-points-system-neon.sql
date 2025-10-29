-- 포인트 시스템 추가 마이그레이션 (Neon PostgreSQL)
-- Neon 콘솔에서 실행하세요

-- 1. users 테이블에 total_points 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
COMMENT ON COLUMN users.total_points IS '사용자 보유 포인트';

-- 2. 기존 사용자들의 total_points를 0으로 초기화
UPDATE users SET total_points = 0 WHERE total_points IS NULL;

-- 3. 인덱스 확인
\d users;

SELECT '✅ 포인트 시스템 마이그레이션 완료 (Neon PostgreSQL)!' as status;
