require('dotenv').config();
const { connect } = require('@planetscale/database');

async function populateAllData() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🚀 Starting data population...\n');

  try {
    // 1. Categories 확인
    console.log('📂 Checking categories...');
    const categoriesResult = await connection.execute('SELECT * FROM categories');
    console.log(`   Found ${categoriesResult.rows.length} categories`);

    if (categoriesResult.rows.length === 0) {
      console.log('   ⚠️  Inserting default categories...');
      await connection.execute(`
        INSERT INTO categories (slug, name_ko, name_en, icon, sort_order, is_active) VALUES
        ('tour', '투어', 'Tour', '🎯', 1, 1),
        ('food', '음식', 'Food', '🍽️', 2, 1),
        ('attraction', '관광지', 'Attraction', '🏛️', 3, 1),
        ('popup', '팝업', 'Pop-up', '🎪', 4, 1),
        ('event', '행사', 'Events', '📅', 5, 1),
        ('experience', '체험', 'Experience', '🎨', 6, 1),
        ('accommodation', '숙박', 'Accommodation', '🏨', 7, 1),
        ('rentcar', '렌트카', 'Car Rental', '🚗', 8, 1)
        ON DUPLICATE KEY UPDATE name_ko = VALUES(name_ko)
      `);
      console.log('   ✅ Categories inserted');
    }

    // 2. Partners 생성
    console.log('\n👥 Creating sample partners...');
    const partners = [
      { email: 'partner1@example.com', company_name: '제주 여행사', business_number: '123-45-67890', representative_name: '김파트너', phone: '010-1234-5678', category: 'tour', status: 'active' },
      { email: 'partner2@example.com', company_name: '서울 맛집', business_number: '234-56-78901', representative_name: '이파트너', phone: '010-2345-6789', category: 'food', status: 'active' },
      { email: 'partner3@example.com', company_name: '부산 관광', business_number: '345-67-89012', representative_name: '박파트너', phone: '010-3456-7890', category: 'attraction', status: 'active' },
      { email: 'partner4@example.com', company_name: '서울 팝업스토어', business_number: '456-78-90123', representative_name: '최파트너', phone: '010-4567-8901', category: 'popup', status: 'active' },
      { email: 'partner5@example.com', company_name: '제주 행사기획', business_number: '567-89-01234', representative_name: '정파트너', phone: '010-5678-9012', category: 'event', status: 'active' },
      { email: 'partner6@example.com', company_name: '서울 체험센터', business_number: '678-90-12345', representative_name: '강파트너', phone: '010-6789-0123', category: 'experience', status: 'active' }
    ];

    let partnerCount = 0;
    for (const p of partners) {
      try {
        await connection.execute(`
          INSERT INTO partners (email, company_name, business_number, representative_name, phone, category, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE company_name = VALUES(company_name)
        `, [p.email, p.company_name, p.business_number, p.representative_name, p.phone, p.category, p.status]);
        partnerCount++;
      } catch (e) {
        console.log(`   ⚠️  ${p.company_name}: ${e.message}`);
      }
    }
    console.log(`   ✅ ${partnerCount} partners created/updated`);

    // 3. Get partner IDs
    const partnerResult = await connection.execute('SELECT id, email FROM partners');
    const partnerMap = {};
    partnerResult.rows.forEach(p => {
      partnerMap[p.email] = p.id;
    });

    // 4. Listings 생성
    console.log('\n📦 Creating sample listings...');
    const listings = [
      // TOUR
      { partner_email: 'partner1@example.com', category: 'tour', title: '제주도 동부 일주 투어', short_description: '제주도 동쪽의 아름다운 명소를 하루에 모두 돌아보는 투어', description_md: '성산일출봉, 섭지코지, 우도 등 제주 동부의 핵심 관광지를 전문 가이드와 함께 편안하게 둘러보세요.', location: '제주', price_from: 85000, price_to: 120000, images: '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800"]', is_featured: 1, rating_avg: 4.8, rating_count: 127 },
      { partner_email: 'partner1@example.com', category: 'tour', title: '서울 고궁 투어', short_description: '경복궁, 창덕궁 등 서울 5대 궁궐 탐방', description_md: '한국의 역사와 문화를 느낄 수 있는 서울 고궁 투어. 전문 문화해설사가 동행합니다.', location: '서울', price_from: 45000, price_to: 65000, images: '["https://images.unsplash.com/photo-1583417267826-aebc4d1542e1?w=800"]', is_featured: 0, rating_avg: 4.6, rating_count: 89 },
      { partner_email: 'partner1@example.com', category: 'tour', title: '부산 해안 일주 투어', short_description: '부산의 아름다운 해안선을 따라가는 투어', description_md: '해운대, 광안리, 송도 등 부산의 명소를 하루에 모두 경험하세요.', location: '부산', price_from: 75000, price_to: 95000, images: '["https://images.unsplash.com/photo-1545640911-323016856f8b?w=800"]', is_featured: 1, rating_avg: 4.7, rating_count: 156 },

      // FOOD
      { partner_email: 'partner2@example.com', category: 'food', title: '미슐랭 가이드 한정식', short_description: '미슐랭 가이드에 소개된 정통 한정식 레스토랑', description_md: '계절 식재료로 만든 정성스러운 한정식 코스. 예약 필수입니다.', location: '서울', price_from: 120000, price_to: 180000, images: '["https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800"]', is_featured: 1, rating_avg: 4.9, rating_count: 234 },
      { partner_email: 'partner2@example.com', category: 'food', title: '제주 흑돼지 명가', short_description: '제주도에서만 맛볼 수 있는 정통 흑돼지 구이', description_md: '신선한 제주 흑돼지를 숯불에 구워 제공합니다. 제주 여행 필수 코스!', location: '제주', price_from: 35000, price_to: 55000, images: '["https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=800"]', is_featured: 0, rating_avg: 4.7, rating_count: 423 },
      { partner_email: 'partner2@example.com', category: 'food', title: '강남 프렌치 레스토랑', short_description: '강남 한복판의 로맨틱한 프렌치 파인다이닝', description_md: '데이트와 기념일에 완벽한 분위기. 와인 페어링 추천.', location: '서울', price_from: 150000, price_to: 250000, images: '["https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800"]', is_featured: 1, rating_avg: 4.8, rating_count: 178 },

      // ATTRACTION
      { partner_email: 'partner3@example.com', category: 'attraction', title: '롯데월드 자유이용권', short_description: '실내외 놀이기구를 무제한 즐기는 자유이용권', description_md: '국내 최대 테마파크 롯데월드에서 하루종일 즐거운 시간을 보내세요.', location: '서울', price_from: 59000, price_to: 59000, images: '["https://images.unsplash.com/photo-1583417269741-66ba48307c74?w=800"]', is_featured: 1, rating_avg: 4.6, rating_count: 1234 },
      { partner_email: 'partner3@example.com', category: 'attraction', title: '에버랜드 종일권', short_description: '한국 최고의 테마파크 에버랜드 입장권', description_md: '사파리, 놀이기구, 공연까지 모두 즐길 수 있는 에버랜드 종일권입니다.', location: '경기', price_from: 62000, price_to: 62000, images: '["https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800"]', is_featured: 1, rating_avg: 4.7, rating_count: 987 },
      { partner_email: 'partner3@example.com', category: 'attraction', title: '부산 아쿠아리움 입장권', short_description: '부산 해운대의 대형 수족관', description_md: '다양한 해양생물을 가까이서 만나볼 수 있습니다.', location: '부산', price_from: 29000, price_to: 29000, images: '["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"]', is_featured: 0, rating_avg: 4.5, rating_count: 567 },

      // POPUP
      { partner_email: 'partner4@example.com', category: 'popup', title: '디즈니 팝업스토어', short_description: '디즈니 캐릭터 굿즈와 포토존이 가득한 팝업', description_md: '기간 한정! 디즈니 100주년 기념 팝업스토어에서 특별한 추억을 만드세요.', location: '서울', price_from: 0, price_to: 0, images: '["https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800"]', is_featured: 1, rating_avg: 4.8, rating_count: 345 },
      { partner_email: 'partner4@example.com', category: 'popup', title: 'BTS 팝업스토어', short_description: 'BTS 공식 굿즈와 체험존', description_md: 'ARMY 필수 방문 코스! BTS 관련 굿즈와 포토존이 준비되어 있습니다.', location: '서울', price_from: 0, price_to: 0, images: '["https://images.unsplash.com/photo-1567359781514-3b964e2b04d6?w=800"]', is_featured: 1, rating_avg: 4.9, rating_count: 789 },
      { partner_email: 'partner4@example.com', category: 'popup', title: '카카오프렌즈 스토어', short_description: '라이언, 춘식이 등 카카오프렌즈 캐릭터 굿즈', description_md: '귀여운 카카오프렌즈 캐릭터 상품을 만나보세요.', location: '서울', price_from: 0, price_to: 0, images: '["https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800"]', is_featured: 0, rating_avg: 4.6, rating_count: 234 },

      // EVENT
      { partner_email: 'partner5@example.com', category: 'event', title: '제주 불꽃축제', short_description: '제주 해변에서 펼쳐지는 환상적인 불꽃쇼', description_md: '매년 여름 개최되는 제주 최대 불꽃축제. 가족, 연인과 함께 즐기세요.', location: '제주', price_from: 0, price_to: 0, images: '["https://images.unsplash.com/photo-1532386236358-a33d8a9f6803?w=800"]', is_featured: 1, rating_avg: 4.9, rating_count: 456 },
      { partner_email: 'partner5@example.com', category: 'event', title: '서울 재즈 페스티벌', short_description: '국내외 유명 재즈 아티스트 공연', description_md: '올림픽공원에서 열리는 3일간의 재즈 페스티벌', location: '서울', price_from: 80000, price_to: 150000, images: '["https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800"]', is_featured: 1, rating_avg: 4.7, rating_count: 234 },
      { partner_email: 'partner5@example.com', category: 'event', title: '부산 국제 영화제', short_description: '아시아 최대 영화제 BIFF', description_md: '세계 각국의 영화를 부산에서 만나보세요.', location: '부산', price_from: 15000, price_to: 30000, images: '["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800"]', is_featured: 0, rating_avg: 4.8, rating_count: 567 },

      // EXPERIENCE
      { partner_email: 'partner6@example.com', category: 'experience', title: '도자기 만들기 체험', short_description: '전통 도예가와 함께하는 도자기 핸드메이킹', description_md: '나만의 도자기 작품을 직접 만들어 가져가세요. 초보자도 환영합니다.', location: '서울', price_from: 45000, price_to: 65000, images: '["https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=800"]', is_featured: 1, rating_avg: 4.7, rating_count: 123 },
      { partner_email: 'partner6@example.com', category: 'experience', title: '한복 체험 및 촬영', short_description: '경복궁 앞에서 한복 입고 인생샷 남기기', description_md: '한복 대여 + 전문 사진작가 촬영 + 보정본 5컷 제공', location: '서울', price_from: 35000, price_to: 55000, images: '["https://images.unsplash.com/photo-1583417269941-1c92e448665d?w=800"]', is_featured: 1, rating_avg: 4.8, rating_count: 345 },
      { partner_email: 'partner6@example.com', category: 'experience', title: '제주 승마 체험', short_description: '제주 자연 속에서 즐기는 승마', description_md: '초보자를 위한 기초 레슨과 함께 제주 바다를 배경으로 승마를 즐기세요.', location: '제주', price_from: 70000, price_to: 95000, images: '["https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800"]', is_featured: 0, rating_avg: 4.6, rating_count: 198 }
    ];

    let listingCount = 0;
    for (const listing of listings) {
      const partnerId = partnerMap[listing.partner_email];
      if (!partnerId) {
        console.log(`   ⚠️  Skipping ${listing.title} - partner not found`);
        continue;
      }

      try {
        await connection.execute(`
          INSERT INTO listings (partner_id, category, title, short_description, description_md, location, price_from, price_to, currency, images, is_published, is_active, is_featured, rating_avg, rating_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'KRW', ?, 1, 1, ?, ?, ?)
        `, [partnerId, listing.category, listing.title, listing.short_description, listing.description_md, listing.location, listing.price_from, listing.price_to, listing.images, listing.is_featured, listing.rating_avg, listing.rating_count]);
        listingCount++;
      } catch (e) {
        console.log(`   ⚠️  ${listing.title}: ${e.message}`);
      }
    }
    console.log(`   ✅ ${listingCount} listings created`);

    // 5. Banners 생성
    console.log('\n🎨 Creating sample banners...');
    const banners = [
      { image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200', title: '제주도 특가 패키지', link_url: '/category/tour', display_order: 1, is_active: 1 },
      { image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200', title: '미식 투어', link_url: '/category/food', display_order: 2, is_active: 1 },
      { image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200', title: '여름 휴가 특별전', link_url: '/category/tour', display_order: 3, is_active: 1 },
      { image_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200', title: '체험 프로그램', link_url: '/category/experience', display_order: 4, is_active: 1 }
    ];

    let bannerCount = 0;
    for (const banner of banners) {
      try {
        await connection.execute(`
          INSERT INTO home_banners (image_url, title, link_url, display_order, is_active)
          VALUES (?, ?, ?, ?, ?)
        `, [banner.image_url, banner.title, banner.link_url, banner.display_order, banner.is_active]);
        bannerCount++;
      } catch (e) {
        console.log(`   ⚠️  ${banner.title}: ${e.message}`);
      }
    }
    console.log(`   ✅ ${bannerCount} banners created`);

    console.log('\n✅ Data population completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Partners: ${partnerCount}`);
    console.log(`   - Listings: ${listingCount}`);
    console.log(`   - Banners: ${bannerCount}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

populateAllData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
