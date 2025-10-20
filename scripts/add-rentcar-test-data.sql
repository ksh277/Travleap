-- 렌트카 테스트 데이터 추가
-- 업체 2개 + 각 업체당 차량 3대

-- 업체 1: CSV 업로드용 (신안 퍼플렌터카)
INSERT INTO rentcar_vendors (
  vendor_code, business_name, brand_name, business_number,
  contact_name, contact_email, contact_phone,
  description, status, is_verified, commission_rate,
  api_enabled, total_vehicles,
  created_at, updated_at
) VALUES (
  'CSV_VENDOR_001',
  '신안 퍼플렌터카',
  '퍼플렌터카',
  '123-45-67890',
  '김렌트',
  'purple@rentcar.com',
  '061-111-2222',
  '신안군 전 지역 렌터카 서비스. CSV 업로드 방식으로 차량 관리.',
  'active',
  1,
  10.00,
  0,
  0,
  NOW(),
  NOW()
);

SET @csv_vendor_id = LAST_INSERT_ID();

-- 업체 2: API 연동용 (증도 그린렌터카)
INSERT INTO rentcar_vendors (
  vendor_code, business_name, brand_name, business_number,
  contact_name, contact_email, contact_phone,
  description, status, is_verified, commission_rate,
  api_enabled, api_url, api_key, api_auth_type, total_vehicles,
  created_at, updated_at
) VALUES (
  'API_VENDOR_001',
  '증도 그린렌터카',
  '그린렌터카',
  '098-76-54321',
  '박자동',
  'green@rentcar.com',
  '061-333-4444',
  '증도면 전문 렌터카. API 자동 동기화로 실시간 차량 관리.',
  'active',
  1,
  10.00,
  1,
  'http://localhost:3005/api/vehicles',
  'test_api_key_12345',
  'bearer',
  0,
  NOW(),
  NOW()
);

SET @api_vendor_id = LAST_INSERT_ID();

-- CSV 업체 차량 3대
INSERT INTO rentcar_vehicles (
  vendor_id, vehicle_code, brand, model, year, display_name,
  vehicle_class, vehicle_type, fuel_type, transmission,
  seating_capacity, door_count, large_bags, small_bags,
  daily_rate_krw, deposit_amount_krw,
  thumbnail_url, images, features,
  age_requirement, license_requirement, mileage_limit_per_day,
  unlimited_mileage, smoking_allowed, is_active,
  created_at, updated_at
) VALUES
(
  @csv_vendor_id, 'CSV001', '현대', '쏘나타', 2024, '현대 쏘나타 2024',
  'midsize', '세단', 'gasoline', 'automatic',
  5, 4, 3, 2,
  60000, 120000,
  'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400',
  '["https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800"]',
  '["스마트 크루즈 컨트롤", "후방 카메라", "열선 시트"]',
  21, '1년 이상', 200,
  0, 0, 1,
  NOW(), NOW()
),
(
  @csv_vendor_id, 'CSV002', '기아', '스포티지', 2024, '기아 스포티지 2024',
  'suv', 'SUV', 'diesel', 'automatic',
  5, 4, 4, 2,
  75000, 150000,
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400',
  '["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800"]',
  '["파노라마 선루프", "전동 트렁크", "LED 헤드라이트"]',
  21, '1년 이상', 200,
  0, 0, 1,
  NOW(), NOW()
),
(
  @csv_vendor_id, 'CSV003', '현대', '캐스퍼', 2024, '현대 캐스퍼 2024',
  'compact', '경차', 'gasoline', 'automatic',
  4, 4, 1, 2,
  35000, 80000,
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
  '["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800"]',
  '["연비 우수", "주차 편리", "블루투스"]',
  21, '1년 이상', 150,
  0, 0, 1,
  NOW(), NOW()
);

-- CSV 업체의 total_vehicles 업데이트
UPDATE rentcar_vendors SET total_vehicles = 3 WHERE id = @csv_vendor_id;
