-- 즉시 실행: 테스트 벤더 계정 생성
-- PlanetScale Console에서 이 SQL을 실행하세요

-- 1. users 테이블에 벤더 계정 생성
INSERT INTO users (
  user_id,
  email,
  password_hash,
  name,
  phone,
  role,
  preferred_language,
  preferred_currency,
  is_active,
  email_verified,
  created_at,
  updated_at
) VALUES (
  CONCAT('vendor_', UNIX_TIMESTAMP()),
  'test@rentcar.com',
  'hashed_test123',
  '테스트렌트카',
  '010-9999-8888',
  'vendor',
  'ko',
  'KRW',
  true,
  true,
  NOW(),
  NOW()
);

-- 2. 방금 생성된 user_id 가져오기
SET @user_id = LAST_INSERT_ID();

-- 3. rentcar_vendors 테이블에 업체 정보 생성
INSERT INTO rentcar_vendors (
  name,
  contact_email,
  contact_phone,
  contact_person,
  business_number,
  address,
  is_active,
  is_verified,
  vehicle_count,
  user_id,
  created_at,
  updated_at
) VALUES (
  '테스트렌트카',
  'test@rentcar.com',
  '010-9999-8888',
  '김테스트',
  '123-45-67890',
  '서울시 강남구 테스트동 123',
  true,
  true,
  0,
  @user_id,
  NOW(),
  NOW()
);

-- 4. 생성된 vendor_id 가져오기
SET @vendor_id = LAST_INSERT_ID();

-- 5. 테스트 차량 2대 추가
INSERT INTO rentcar_vehicles (
  vendor_id,
  display_name,
  vehicle_class,
  seating_capacity,
  transmission_type,
  fuel_type,
  daily_rate_krw,
  weekly_rate_krw,
  monthly_rate_krw,
  mileage_limit_km,
  excess_mileage_fee_krw,
  is_available,
  images,
  created_at,
  updated_at
) VALUES
(
  @vendor_id,
  '현대 그랜저 2024',
  '대형',
  5,
  '자동',
  '가솔린',
  80000,
  500000,
  1800000,
  200,
  100,
  true,
  '[]',
  NOW(),
  NOW()
),
(
  @vendor_id,
  '기아 K5 2024',
  '중형',
  5,
  '자동',
  '가솔린',
  60000,
  400000,
  1500000,
  200,
  100,
  true,
  '[]',
  NOW(),
  NOW()
);

-- 6. 결과 확인
SELECT
  u.id as user_id,
  u.email,
  rv.id as vendor_id,
  rv.name as vendor_name,
  (SELECT COUNT(*) FROM rentcar_vehicles WHERE vendor_id = rv.id) as vehicle_count
FROM users u
INNER JOIN rentcar_vendors rv ON rv.user_id = u.id
WHERE u.email = 'test@rentcar.com';

-- 로그인 정보:
-- 이메일: test@rentcar.com
-- 비밀번호: test123
