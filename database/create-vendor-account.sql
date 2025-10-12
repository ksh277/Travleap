-- ============================================
-- 렌트카 업체 테스트 계정 생성 스크립트
-- ============================================

-- 실행 방법:
-- 1. PlanetScale 대시보드 접속
-- 2. Console 탭에서 이 SQL 실행
-- 3. 아래 계정 정보로 로그인

-- ============================================
-- 1. 사용자 계정 생성 (role: vendor)
-- ============================================

INSERT INTO users (
  user_id,
  email,
  password_hash,
  name,
  phone,
  role,
  preferred_language,
  preferred_currency,
  marketing_consent,
  is_active,
  email_verified,
  created_at,
  updated_at
) VALUES (
  'vendor_test_001',
  'rentcar@test.com',                    -- 로그인 이메일
  'hashed_test123',                      -- 비밀번호: test123 (실제로는 bcrypt 해싱 필요)
  '신안렌트카',
  '010-1234-5678',
  'vendor',                              -- 중요: role을 vendor로 설정
  'ko',
  'KRW',
  false,
  true,                                  -- 활성화
  true,
  NOW(),
  NOW()
);

-- 방금 생성한 user_id 가져오기 (다음 단계에서 사용)
SET @user_id = LAST_INSERT_ID();

-- ============================================
-- 2. 렌트카 업체 정보 생성
-- ============================================

INSERT INTO rentcar_vendors (
  name,
  business_registration_number,
  contact_email,
  contact_phone,
  contact_person,
  address,
  description,
  website_url,
  operating_hours,
  supported_languages,
  insurance_partners,
  pickup_locations,
  dropoff_locations,
  is_active,
  is_verified,
  vehicle_count,
  rating_avg,
  rating_count,
  user_id,                               -- 사용자 계정과 연결
  created_at,
  updated_at
) VALUES (
  '신안렌트카',
  '123-45-67890',
  'rentcar@test.com',
  '010-1234-5678',
  '홍길동',
  '전라남도 신안군 압해읍',
  '신안 지역 최고의 렌트카 서비스를 제공합니다.',
  'https://shinanrentcar.com',
  '09:00-18:00',
  '["ko"]',
  '["삼성화재", "현대해상"]',
  '["신안공항", "압해읍"]',
  '["신안공항", "압해읍"]',
  true,                                  -- 활성화
  true,                                  -- 인증됨
  0,                                     -- 초기 차량 수
  0.0,
  0,
  @user_id,                              -- 위에서 생성한 user와 연결
  NOW(),
  NOW()
);

SET @vendor_id = LAST_INSERT_ID();

-- ============================================
-- 3. 테스트 차량 등록
-- ============================================

-- 차량 1: K5 중형 세단
INSERT INTO rentcar_vehicles (
  vendor_id,
  vehicle_class,
  display_name,
  manufacturer,
  model_name,
  model_year,
  seating_capacity,
  transmission_type,
  fuel_type,
  fuel_efficiency,
  engine_displacement,
  daily_rate_krw,
  weekly_rate_krw,
  monthly_rate_krw,
  deposit_amount_krw,
  mileage_limit_km,
  extra_mileage_fee_krw,
  min_driver_age,
  min_license_years,
  vehicle_features,
  images,
  vehicle_description,
  is_available,
  is_featured,
  created_at,
  updated_at
) VALUES (
  @vendor_id,
  '중형',
  'K5 2023년형',
  '기아',
  'K5',
  2023,
  5,
  '자동',
  '휘발유',
  '12.5 km/L',
  '2.0L',
  80000,
  500000,
  1800000,
  200000,
  200,
  200,
  21,
  1,
  '["스마트키", "후방카메라", "블루투스", "내비게이션", "열선시트"]',
  '["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800", "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800"]',
  '깔끔하고 연비 좋은 중형 세단입니다.',
  true,
  false,
  NOW(),
  NOW()
);

-- 차량 2: 쏘나타 중형 세단
INSERT INTO rentcar_vehicles (
  vendor_id,
  vehicle_class,
  display_name,
  manufacturer,
  model_name,
  model_year,
  seating_capacity,
  transmission_type,
  fuel_type,
  fuel_efficiency,
  engine_displacement,
  daily_rate_krw,
  weekly_rate_krw,
  monthly_rate_krw,
  deposit_amount_krw,
  mileage_limit_km,
  extra_mileage_fee_krw,
  min_driver_age,
  min_license_years,
  vehicle_features,
  images,
  vehicle_description,
  is_available,
  is_featured,
  created_at,
  updated_at
) VALUES (
  @vendor_id,
  '중형',
  '쏘나타 2024년형',
  '현대',
  '쏘나타',
  2024,
  5,
  '자동',
  '하이브리드',
  '18.0 km/L',
  '2.0L',
  85000,
  550000,
  1900000,
  200000,
  200,
  200,
  21,
  1,
  '["스마트키", "후방카메라", "블루투스", "내비게이션", "통풍시트", "HUD"]',
  '["https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800", "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800"]',
  '최신형 하이브리드 세단으로 연비가 뛰어납니다.',
  true,
  true,
  NOW(),
  NOW()
);

-- 차량 3: 카니발 대형 승합
INSERT INTO rentcar_vehicles (
  vendor_id,
  vehicle_class,
  display_name,
  manufacturer,
  model_name,
  model_year,
  seating_capacity,
  transmission_type,
  fuel_type,
  fuel_efficiency,
  engine_displacement,
  daily_rate_krw,
  weekly_rate_krw,
  monthly_rate_krw,
  deposit_amount_krw,
  mileage_limit_km,
  extra_mileage_fee_krw,
  min_driver_age,
  min_license_years,
  vehicle_features,
  images,
  vehicle_description,
  is_available,
  is_featured,
  created_at,
  updated_at
) VALUES (
  @vendor_id,
  '승합',
  '카니발 2023년형',
  '기아',
  '카니발',
  2023,
  11,
  '자동',
  '경유',
  '10.5 km/L',
  '2.2L',
  120000,
  780000,
  2700000,
  300000,
  200,
  300,
  21,
  1,
  '["스마트키", "후방카메라", "블루투스", "내비게이션", "3열시트", "파워도어"]',
  '["https://images.unsplash.com/photo-1570733577667-8e1759dffb6e?w=800", "https://images.unsplash.com/photo-1570733577667-8e1759dffb6e?w=800"]',
  '대가족 여행에 최적화된 11인승 승합차입니다.',
  true,
  false,
  NOW(),
  NOW()
);

-- ============================================
-- 4. 차량 수 업데이트
-- ============================================

UPDATE rentcar_vendors
SET vehicle_count = 3
WHERE id = @vendor_id;

-- ============================================
-- 완료 메시지
-- ============================================

SELECT
  '✅ 렌트카 업체 테스트 계정 생성 완료!' as message,
  '──────────────────────────────' as separator,
  '' as blank1,
  '📧 로그인 정보:' as login_header,
  '   이메일: rentcar@test.com' as email,
  '   비밀번호: test123' as password,
  '   역할: 렌트카 업체 (vendor)' as role,
  '' as blank2,
  '🏢 업체 정보:' as vendor_header,
  '   업체명: 신안렌트카' as vendor_name,
  CONCAT('   Vendor ID: ', @vendor_id) as vendor_id,
  CONCAT('   User ID: ', @user_id) as user_id,
  '' as blank3,
  '🚗 등록된 차량: 3대' as vehicles_header,
  '   1. K5 2023년형 (중형 세단)' as vehicle1,
  '   2. 쏘나타 2024년형 (하이브리드)' as vehicle2,
  '   3. 카니발 2023년형 (11인승)' as vehicle3,
  '' as blank4,
  '🔗 접속 URL:' as url_header,
  '   로그인: /login' as login_url,
  '   대시보드: /vendor/dashboard' as dashboard_url,
  '' as blank5,
  '──────────────────────────────' as separator2;
