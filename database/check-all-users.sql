-- 현재 DB에 있는 모든 사용자 확인
SELECT
  id,
  email,
  role,
  name,
  password_hash,
  LENGTH(password_hash) as hash_length,
  LEFT(password_hash, 10) as hash_prefix,
  is_active,
  created_at
FROM users
ORDER BY created_at DESC;

-- 비밀번호 해시 형식별 개수
SELECT
  CASE
    WHEN password_hash LIKE '$2b$%' THEN 'bcrypt'
    WHEN password_hash LIKE 'hashed_%' THEN 'simple_hash'
    ELSE 'unknown'
  END as hash_type,
  COUNT(*) as count,
  GROUP_CONCAT(email SEPARATOR ', ') as emails
FROM users
GROUP BY hash_type;
