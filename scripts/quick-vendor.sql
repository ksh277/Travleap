-- 기존 vendor@test.com 계정의 role을 vendor로 변경
UPDATE users
SET role = 'vendor'
WHERE email = 'vendor@test.com';

-- 확인
SELECT id, email, name, role
FROM users
WHERE email = 'vendor@test.com';
