-- ===================================================
-- 숙박 테스트 데이터 추가 (PlanetScale 콘솔에서 실행)
-- ===================================================

-- 1. 파트너(업체) 2개 추가
-- CSV 방식: 신안 바다뷰 펜션
INSERT INTO partners (
  business_name, contact_name, phone, email,
  is_active, is_verified, is_featured, tier,
  created_at, updated_at
) VALUES (
  '신안 바다뷰 펜션', '김철수', '010-1234-5678', 'seaview@test.com',
  1, 1, 0, 'basic',
  NOW(), NOW()
);

-- PMS 방식: 증도 힐링 호텔
INSERT INTO partners (
  business_name, contact_name, phone, email,
  is_active, is_verified, is_featured, tier,
  created_at, updated_at
) VALUES (
  '증도 힐링 호텔', '박민수', '010-9876-5432', 'healing@test.com',
  1, 1, 0, 'premium',
  NOW(), NOW()
);

-- ===================================================
-- 2. 각 파트너의 ID를 확인한 후, listings (객실) 추가
-- ===================================================

-- 먼저 방금 추가한 파트너들의 ID 확인
SELECT id, business_name FROM partners WHERE business_name IN ('신안 바다뷰 펜션', '증도 힐링 호텔');

-- 결과에서 나온 partner_id를 아래 쿼리에 사용
-- 예시: 신안 바다뷰 펜션 ID가 100, 증도 힐링 호텔 ID가 101이라고 가정

-- 신안 바다뷰 펜션 - 객실 3개
-- category_id 1857 = 숙박
INSERT INTO listings (
  partner_id, category_id, listing_name, description,
  location, address, price_from,
  images, is_published, is_active,
  rating_avg, rating_count,
  created_at, updated_at
) VALUES
(
  100, 1857, '오션뷰 스위트',
  '넓은 오션뷰와 킹사이즈 침대를 갖춘 프리미엄 객실',
  '신안군', '전라남도 신안군 증도면 해안로 123', 150000,
  '["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"]',
  1, 1, 4.8, 25,
  NOW(), NOW()
),
(
  100, 1857, '스탠다드 더블',
  '깔끔한 더블룸',
  '신안군', '전라남도 신안군 증도면 해안로 123', 100000,
  '["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"]',
  1, 1, 4.5, 18,
  NOW(), NOW()
),
(
  100, 1857, '패밀리 룸',
  '가족 단위 최적 넓은 공간',
  '신안군', '전라남도 신안군 증도면 해안로 123', 200000,
  '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"]',
  1, 1, 4.9, 30,
  NOW(), NOW()
);

-- 증도 힐링 호텔 - 객실 3개
INSERT INTO listings (
  partner_id, category_id, listing_name, description,
  location, address, price_from,
  images, is_published, is_active,
  rating_avg, rating_count,
  created_at, updated_at
) VALUES
(
  101, 1857, '디럭스 트윈',
  '편안한 트윈 침대',
  '증도', '전라남도 신안군 증도면 힐링로 456', 130000,
  '["https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800"]',
  1, 1, 4.7, 22,
  NOW(), NOW()
),
(
  101, 1857, '이그제큐티브 스위트',
  '최고급 스위트룸',
  '증도', '전라남도 신안군 증도면 힐링로 456', 220000,
  '["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"]',
  1, 1, 5.0, 35,
  NOW(), NOW()
),
(
  101, 1857, '스탠다드 싱글',
  '1인 여행객을 위한 객실',
  '증도', '전라남도 신안군 증도면 힐링로 456', 80000,
  '["https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800"]',
  1, 1, 4.6, 15,
  NOW(), NOW()
);

-- ===================================================
-- 확인 쿼리
-- ===================================================

-- 추가된 파트너 확인
SELECT * FROM partners WHERE business_name IN ('신안 바다뷰 펜션', '증도 힐링 호텔');

-- 추가된 객실 확인
SELECT p.business_name, l.listing_name, l.price_from
FROM listings l
JOIN partners p ON l.partner_id = p.id
WHERE p.business_name IN ('신안 바다뷰 펜션', '증도 힐링 호텔')
AND l.category_id = 1857;
