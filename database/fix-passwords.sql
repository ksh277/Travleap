-- 기존 계정들의 비밀번호를 간단한 해시로 변경
-- PlanetScale Console에서 실행하세요

-- 기존 관리자 계정 비밀번호 수정
UPDATE users
SET password_hash = 'hashed_admin123'
WHERE email = 'admin@shinan.com';

UPDATE users
SET password_hash = 'hashed_manager123'
WHERE email = 'manager@shinan.com';

-- 테스트 계정들도 업데이트
UPDATE users
SET password_hash = 'hashed_admin123'
WHERE email = 'admin@test.com';

UPDATE users
SET password_hash = 'hashed_user123'
WHERE email = 'user@test.com';

UPDATE users
SET password_hash = 'hashed_vendor123'
WHERE email = 'vendor@test.com';

-- 확인
SELECT id, email, role, password_hash
FROM users
WHERE email IN ('admin@shinan.com', 'manager@shinan.com', 'admin@test.com', 'user@test.com', 'vendor@test.com');
