-- 간단한 테스트 계정 3개 생성
-- PlanetScale Console에서 실행하세요

-- 1. 관리자 계정
INSERT INTO users (user_id, email, password_hash, name, phone, role, preferred_language, preferred_currency, is_active, email_verified, created_at, updated_at)
VALUES ('admin1', 'admin@test.com', 'hashed_admin123', '관리자', '010-0000-0001', 'admin', 'ko', 'KRW', true, true, NOW(), NOW())
ON DUPLICATE KEY UPDATE email = email;

-- 2. 일반 사용자 계정
INSERT INTO users (user_id, email, password_hash, name, phone, role, preferred_language, preferred_currency, is_active, email_verified, created_at, updated_at)
VALUES ('user1', 'user@test.com', 'hashed_user123', '일반사용자', '010-0000-0002', 'user', 'ko', 'KRW', true, true, NOW(), NOW())
ON DUPLICATE KEY UPDATE email = email;

-- 3. 벤더 사용자 계정
INSERT INTO users (user_id, email, password_hash, name, phone, role, preferred_language, preferred_currency, is_active, email_verified, created_at, updated_at)
VALUES ('vendor1', 'vendor@test.com', 'hashed_vendor123', '벤더업체', '010-0000-0003', 'vendor', 'ko', 'KRW', true, true, NOW(), NOW())
ON DUPLICATE KEY UPDATE email = email;

-- 4. 벤더의 rentcar_vendors 레코드 생성
INSERT INTO rentcar_vendors (
  name, contact_email, contact_phone, contact_person,
  business_number, address, is_active, is_verified,
  vehicle_count, user_id, created_at, updated_at
)
SELECT
  '테스트렌트카', 'vendor@test.com', '010-0000-0003', '김벤더',
  '123-45-67890', '서울시 강남구', true, true,
  0, u.id, NOW(), NOW()
FROM users u
WHERE u.email = 'vendor@test.com'
ON DUPLICATE KEY UPDATE name = name;

-- 확인 쿼리
SELECT
  u.id, u.email, u.role, u.name,
  CASE WHEN u.role = 'vendor' THEN rv.id ELSE NULL END as vendor_id,
  CASE WHEN u.role = 'vendor' THEN rv.name ELSE NULL END as vendor_name
FROM users u
LEFT JOIN rentcar_vendors rv ON rv.user_id = u.id
WHERE u.email IN ('admin@test.com', 'user@test.com', 'vendor@test.com')
ORDER BY u.role;

-- 테스트 계정 정보:
-- admin@test.com / admin123
-- user@test.com / user123
-- vendor@test.com / vendor123
