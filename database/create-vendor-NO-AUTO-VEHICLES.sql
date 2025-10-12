-- ============================================
-- 렌트카 업체 계정 생성 (차량 자동 등록 없음)
-- ============================================
--
-- 개선 사항:
-- - 차량 자동 등록 제거 (실제 차량만 나중에 추가)
-- - 업체 정보만 생성
-- - vehicle_count는 0으로 시작
--
-- 사용 방법:
-- 1. 아래 정보를 업체에 맞게 수정
-- 2. PlanetScale Console에서 실행
-- 3. 이메일/비밀번호를 업체에게 전달
-- ============================================

-- ============================================
-- [여기를 수정하세요]
-- ============================================
SET @vendor_email = 'rentcar@test.com';        -- 로그인 이메일
SET @vendor_password = 'test123';              -- 비밀번호
SET @vendor_name = '신안렌트카';               -- 업체명
SET @contact_person = '홍길동';                -- 담당자명
SET @contact_phone = '010-1234-5678';          -- 전화번호
SET @business_number = '123-45-67890';         -- 사업자등록번호 (선택)
SET @address = '전라남도 신안군 압해읍';       -- 주소 (선택)
-- ============================================

-- 1. 사용자 계정 생성
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
  CONCAT('vendor_', UNIX_TIMESTAMP()),
  @vendor_email,
  CONCAT('hashed_', @vendor_password),  -- 실제로는 bcrypt 필요
  @vendor_name,
  @contact_phone,
  'vendor',                             -- 중요: role = vendor
  'ko',
  'KRW',
  false,
  true,                                 -- 바로 활성화
  true,
  NOW(),
  NOW()
);

-- 방금 생성한 user_id 저장
SET @user_id = LAST_INSERT_ID();

-- 2. 업체 정보 생성 (차량 없음)
INSERT INTO rentcar_vendors (
  name,
  business_registration_number,
  contact_email,
  contact_phone,
  contact_person,
  address,
  description,
  operating_hours,
  supported_languages,
  is_active,
  is_verified,
  vehicle_count,                        -- 0으로 시작
  rating_avg,
  rating_count,
  user_id,
  created_at,
  updated_at
) VALUES (
  @vendor_name,
  @business_number,
  @vendor_email,
  @contact_phone,
  @contact_person,
  @address,
  CONCAT(@vendor_name, ' - 신안 지역 최고의 렌트카 서비스'),
  '09:00-18:00',
  JSON_ARRAY('ko'),
  true,                                 -- 활성화
  true,                                 -- 인증됨
  0,                                    -- 차량 0대
  0.0,
  0,
  @user_id,
  NOW(),
  NOW()
);

SET @vendor_id = LAST_INSERT_ID();

-- ============================================
-- 완료 메시지
-- ============================================
SELECT
  '✅ 렌트카 업체 계정 생성 완료!' as message,
  '──────────────────────────────' as separator,
  '' as blank1,
  '📧 로그인 정보:' as login_header,
  CONCAT('   이메일: ', @vendor_email) as email,
  CONCAT('   비밀번호: ', @vendor_password) as password,
  '   역할: 렌트카 업체 (vendor)' as role,
  '' as blank2,
  '🏢 업체 정보:' as vendor_header,
  CONCAT('   업체명: ', @vendor_name) as vendor_name,
  CONCAT('   담당자: ', @contact_person) as contact_person,
  CONCAT('   전화번호: ', @contact_phone) as phone,
  CONCAT('   Vendor ID: ', @vendor_id) as vendor_id,
  CONCAT('   User ID: ', @user_id) as user_id,
  '' as blank3,
  '🚗 등록된 차량: 0대' as vehicles_header,
  '   (차량은 나중에 추가해주세요)' as vehicles_note,
  '' as blank4,
  '🔗 접속 URL:' as url_header,
  '   로그인: /login' as login_url,
  '   대시보드: /vendor/dashboard' as dashboard_url,
  '' as blank5,
  '📝 다음 단계:' as next_steps_header,
  '   1. 업체에게 이메일/비밀번호 전달' as step1,
  '   2. 업체가 로그인' as step2,
  '   3. 관리자 또는 업체가 차량 추가' as step3,
  '' as blank6,
  '──────────────────────────────' as separator2;

-- ============================================
-- 차량 추가 방법 (나중에 사용)
-- ============================================
--
-- 방법 1: AdminPage에서 차량 추가 (권장)
-- - /admin → 렌트카 관리 → 업체 선택 → 차량 추가
--
-- 방법 2: SQL로 직접 추가
--
-- INSERT INTO rentcar_vehicles (
--   vendor_id,
--   vehicle_class,
--   display_name,
--   manufacturer,
--   model_name,
--   model_year,
--   seating_capacity,
--   transmission_type,
--   fuel_type,
--   daily_rate_krw,
--   weekly_rate_krw,
--   monthly_rate_krw,
--   deposit_amount_krw,
--   mileage_limit_km,
--   extra_mileage_fee_krw,
--   min_driver_age,
--   min_license_years,
--   vehicle_features,
--   images,
--   vehicle_description,
--   is_available,
--   is_featured,
--   created_at,
--   updated_at
-- ) VALUES (
--   @vendor_id,                        -- 위에서 생성한 vendor_id
--   '중형',                            -- 차량 등급
--   'K5 2023년형',                     -- 차량명
--   '기아',                            -- 제조사
--   'K5',                              -- 모델명
--   2023,                              -- 연식
--   5,                                 -- 인승
--   '자동',                            -- 변속기
--   '휘발유',                          -- 연료
--   80000,                             -- 일일 요금
--   500000,                            -- 주간 요금
--   1800000,                           -- 월간 요금
--   200000,                            -- 보증금
--   200,                               -- 일일 주행 제한
--   200,                               -- 초과 주행 요금
--   21,                                -- 최소 운전자 나이
--   1,                                 -- 최소 면허 연수
--   JSON_ARRAY('스마트키', '후방카메라', '블루투스', '내비게이션'),
--   JSON_ARRAY('https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800'),
--   'K5 2023년형 - 깔끔하고 연비 좋은 중형 세단',
--   true,                              -- 예약 가능
--   false,                             -- 추천 상품 아님
--   NOW(),
--   NOW()
-- );
--
-- -- 차량 수 업데이트
-- UPDATE rentcar_vendors
-- SET vehicle_count = vehicle_count + 1
-- WHERE id = @vendor_id;
--
-- ============================================
