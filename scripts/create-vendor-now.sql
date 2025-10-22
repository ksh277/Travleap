-- 렌트카 벤더 계정 생성
-- 이메일: rentcar@vendor.com
-- 비밀번호: rentcar123 (해시됨)

-- 1. 사용자 생성 (role: vendor)
INSERT INTO users (email, password_hash, name, phone, role, created_at)
VALUES (
  'rentcar@vendor.com',
  '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zWRmKKJqLKhLkLcQC6Ghy', -- rentcar123
  '렌트카매니저',
  '010-9999-9999',
  'vendor',
  NOW()
);

-- 2. 생성된 user_id 확인 (마지막에 생성된 ID)
SET @user_id = LAST_INSERT_ID();

-- 3. 렌트카 벤더 정보 생성
INSERT INTO rentcar_vendors (
  user_id,
  business_name,
  business_registration_number,
  brand_name,
  contact_phone,
  contact_email,
  status,
  created_at
)
VALUES (
  @user_id,
  '트래블립렌트카',
  '999-99-99999',
  '트래블립렌트카',
  '010-9999-9999',
  'rentcar@vendor.com',
  'active',
  NOW()
);

-- 4. 확인
SELECT
  u.id as user_id,
  u.email,
  u.name,
  u.role,
  rv.id as vendor_id,
  rv.business_name
FROM users u
LEFT JOIN rentcar_vendors rv ON u.id = rv.user_id
WHERE u.email = 'rentcar@vendor.com';
