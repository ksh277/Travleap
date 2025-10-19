-- Insert sample listings for all categories
-- Make sure categories and partners exist first

-- Insert sample partner if not exists
INSERT INTO partners (email, business_name, business_registration_number, contact_name, contact_phone, contact_email, address, location, category, tier, is_verified, is_active, services)
VALUES
  ('partner1@example.com', '제주 여행사', '123-45-67890', '김파트너', '010-1234-5678', 'partner1@example.com', '제주시 중앙로 100', '제주', 'tour', 'premium', 1, 1, '투어, 체험, 가이드'),
  ('partner2@example.com', '서울 맛집', '234-56-78901', '이파트너', '010-2345-6789', 'partner2@example.com', '서울시 강남구 테헤란로 200', '서울', 'food', 'standard', 1, 1, '한식, 양식, 카페'),
  ('partner3@example.com', '부산 관광', '345-67-89012', '박파트너', '010-3456-7890', 'partner3@example.com', '부산시 해운대구 해변로 300', '부산', 'attraction', 'premium', 1, 1, '관광지, 체험'),
  ('partner4@example.com', '서울 팝업스토어', '456-78-90123', '최파트너', '010-4567-8901', 'partner4@example.com', '서울시 홍대 어울마당로 400', '서울', 'popup', 'standard', 1, 1, '팝업스토어, 전시'),
  ('partner5@example.com', '제주 행사기획', '567-89-01234', '정파트너', '010-5678-9012', 'partner5@example.com', '제주시 노형로 500', '제주', 'event', 'premium', 1, 1, '행사, 이벤트'),
  ('partner6@example.com', '서울 체험센터', '678-90-12345', '강파트너', '010-6789-0123', 'partner6@example.com', '서울시 종로구 삼청로 600', '서울', 'experience', 'standard', 1, 1, '체험, 워크샵')
ON DUPLICATE KEY UPDATE email=email;

-- Get partner IDs (assuming they were just created or exist)
SET @partner1 = (SELECT id FROM partners WHERE email = 'partner1@example.com' LIMIT 1);
SET @partner2 = (SELECT id FROM partners WHERE email = 'partner2@example.com' LIMIT 1);
SET @partner3 = (SELECT id FROM partners WHERE email = 'partner3@example.com' LIMIT 1);
SET @partner4 = (SELECT id FROM partners WHERE email = 'partner4@example.com' LIMIT 1);
SET @partner5 = (SELECT id FROM partners WHERE email = 'partner5@example.com' LIMIT 1);
SET @partner6 = (SELECT id FROM partners WHERE email = 'partner6@example.com' LIMIT 1);

-- Get category IDs
SET @cat_tour = (SELECT id FROM categories WHERE slug = 'tour' LIMIT 1);
SET @cat_food = (SELECT id FROM categories WHERE slug = 'food' LIMIT 1);
SET @cat_attraction = (SELECT id FROM categories WHERE slug = 'attraction' LIMIT 1);
SET @cat_popup = (SELECT id FROM categories WHERE slug = 'popup' LIMIT 1);
SET @cat_event = (SELECT id FROM categories WHERE slug = 'event' LIMIT 1);
SET @cat_experience = (SELECT id FROM categories WHERE slug = 'experience' LIMIT 1);

-- Insert sample listings for TOUR category
INSERT INTO listings (partner_id, category_id, title, short_description, description_md, location, price_from, price_to, currency, images, is_published, is_active, is_featured, rating_avg, rating_count, view_count)
VALUES
  (@partner1, @cat_tour, '제주도 동부 일주 투어', '제주도 동쪽의 아름다운 명소를 하루에 모두 돌아보는 투어', '성산일출봉, 섭지코지, 우도 등 제주 동부의 핵심 관광지를 전문 가이드와 함께 편안하게 둘러보세요.', '제주', 85000, 120000, 'KRW', '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800"]', 1, 1, 1, '4.8', 127, 1523),
  (@partner1, @cat_tour, '서울 고궁 투어', '경복궁, 창덕궁 등 서울 5대 궁궐 탐방', '한국의 역사와 문화를 느낄 수 있는 서울 고궁 투어. 전문 문화해설사가 동행합니다.', '서울', 45000, 65000, 'KRW', '["https://images.unsplash.com/photo-1583417267826-aebc4d1542e1?w=800"]', 1, 1, 0, '4.6', 89, 876),
  (@partner1, @cat_tour, '부산 해안 일주 투어', '부산의 아름다운 해안선을 따라가는 투어', '해운대, 광안리, 송도 등 부산의 명소를 하루에 모두 경험하세요.', '부산', 75000, 95000, 'KRW', '["https://images.unsplash.com/photo-1545640911-323016856f8b?w=800"]', 1, 1, 1, '4.7', 156, 2134);

-- Insert sample listings for FOOD category
INSERT INTO listings (partner_id, category_id, title, short_description, description_md, location, price_from, price_to, currency, images, is_published, is_active, is_featured, rating_avg, rating_count, view_count)
VALUES
  (@partner2, @cat_food, '미슐랭 가이드 한정식', '미슐랭 가이드에 소개된 정통 한정식 레스토랑', '계절 식재료로 만든 정성스러운 한정식 코스. 예약 필수입니다.', '서울', 120000, 180000, 'KRW', '["https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800"]', 1, 1, 1, '4.9', 234, 3456),
  (@partner2, @cat_food, '제주 흑돼지 명가', '제주도에서만 맛볼 수 있는 정통 흑돼지 구이', '신선한 제주 흑돼지를 숯불에 구워 제공합니다. 제주 여행 필수 코스!', '제주', 35000, 55000, 'KRW', '["https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=800"]', 1, 1, 0, '4.7', 423, 5234),
  (@partner2, @cat_food, '강남 프렌치 레스토랑', '강남 한복판의 로맨틱한 프렌치 파인다이닝', '데이트와 기념일에 완벽한 분위기. 와인 페어링 추천.', '서울', 150000, 250000, 'KRW', '["https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800"]', 1, 1, 1, '4.8', 178, 2987);

-- Insert sample listings for ATTRACTION category
INSERT INTO listings (partner_id, category_id, title, short_description, description_md, location, price_from, price_to, currency, images, is_published, is_active, is_featured, rating_avg, rating_count, view_count)
VALUES
  (@partner3, @cat_attraction, '롯데월드 자유이용권', '실내외 놀이기구를 무제한 즐기는 자유이용권', '국내 최대 테마파크 롯데월드에서 하루종일 즐거운 시간을 보내세요.', '서울', 59000, 59000, 'KRW', '["https://images.unsplash.com/photo-1583417269741-66ba48307c74?w=800"]', 1, 1, 1, '4.6', 1234, 8765),
  (@partner3, @cat_attraction, '에버랜드 종일권', '한국 최고의 테마파크 에버랜드 입장권', '사파리, 놀이기구, 공연까지 모두 즐길 수 있는 에버랜드 종일권입니다.', '경기', 62000, 62000, 'KRW', '["https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800"]', 1, 1, 1, '4.7', 987, 7654),
  (@partner3, @cat_attraction, '부산 아쿠아리움 입장권', '부산 해운대의 대형 수족관', '다양한 해양생물을 가까이서 만나볼 수 있습니다.', '부산', 29000, 29000, 'KRW', '["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"]', 1, 1, 0, '4.5', 567, 4321);

-- Insert sample listings for POPUP category
INSERT INTO listings (partner_id, category_id, title, short_description, description_md, location, price_from, price_to, currency, images, is_published, is_active, is_featured, rating_avg, rating_count, view_count)
VALUES
  (@partner4, @cat_popup, '디즈니 팝업스토어', '디즈니 캐릭터 굿즈와 포토존이 가득한 팝업', '기간 한정! 디즈니 100주년 기념 팝업스토어에서 특별한 추억을 만드세요.', '서울', 0, 0, 'KRW', '["https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800"]', 1, 1, 1, '4.8', 345, 5678),
  (@partner4, @cat_popup, 'BTS 팝업스토어', 'BTS 공식 굿즈와 체험존', 'ARMY 필수 방문 코스! BTS 관련 굿즈와 포토존이 준비되어 있습니다.', '서울', 0, 0, 'KRW', '["https://images.unsplash.com/photo-1567359781514-3b964e2b04d6?w=800"]', 1, 1, 1, '4.9', 789, 9876),
  (@partner4, @cat_popup, '카카오프렌즈 스토어', '라이언, 춘식이 등 카카오프렌즈 캐릭터 굿즈', '귀여운 카카오프렌즈 캐릭터 상품을 만나보세요.', '서울', 0, 0, 'KRW', '["https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800"]', 1, 1, 0, '4.6', 234, 3456);

-- Insert sample listings for EVENT category
INSERT INTO listings (partner_id, category_id, title, short_description, description_md, location, price_from, price_to, currency, images, is_published, is_active, is_featured, rating_avg, rating_count, view_count)
VALUES
  (@partner5, @cat_event, '제주 불꽃축제', '제주 해변에서 펼쳐지는 환상적인 불꽃쇼', '매년 여름 개최되는 제주 최대 불꽃축제. 가족, 연인과 함께 즐기세요.', '제주', 0, 0, 'KRW', '["https://images.unsplash.com/photo-1532386236358-a33d8a9f6803?w=800"]', 1, 1, 1, '4.9', 456, 6789),
  (@partner5, @cat_event, '서울 재즈 페스티벌', '국내외 유명 재즈 아티스트 공연', '올림픽공원에서 열리는 3일간의 재즈 페스티벌', '서울', 80000, 150000, 'KRW', '["https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800"]', 1, 1, 1, '4.7', 234, 4567),
  (@partner5, @cat_event, '부산 국제 영화제', '아시아 최대 영화제 BIFF', '세계 각국의 영화를 부산에서 만나보세요.', '부산', 15000, 30000, 'KRW', '["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800"]', 1, 1, 0, '4.8', 567, 7890);

-- Insert sample listings for EXPERIENCE category
INSERT INTO listings (partner_id, category_id, title, short_description, description_md, location, price_from, price_to, currency, images, is_published, is_active, is_featured, rating_avg, rating_count, view_count)
VALUES
  (@partner6, @cat_experience, '도자기 만들기 체험', '전통 도예가와 함께하는 도자기 핸드메이킹', '나만의 도자기 작품을 직접 만들어 가져가세요. 초보자도 환영합니다.', '서울', 45000, 65000, 'KRW', '["https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=800"]', 1, 1, 1, '4.7', 123, 2345),
  (@partner6, @cat_experience, '한복 체험 및 촬영', '경복궁 앞에서 한복 입고 인생샷 남기기', '한복 대여 + 전문 사진작가 촬영 + 보정본 5컷 제공', '서울', 35000, 55000, 'KRW', '["https://images.unsplash.com/photo-1583417269941-1c92e448665d?w=800"]', 1, 1, 1, '4.8', 345, 5678),
  (@partner6, @cat_experience, '제주 승마 체험', '제주 자연 속에서 즐기는 승마', '초보자를 위한 기초 레슨과 함께 제주 바다를 배경으로 승마를 즐기세요.', '제주', 70000, 95000, 'KRW', '["https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800"]', 1, 1, 0, '4.6', 198, 3456);
