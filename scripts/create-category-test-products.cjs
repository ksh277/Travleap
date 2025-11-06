const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function createCategoryProducts() {
  console.log('🚀 각 카테고리 전용 테이블에 테스트 상품 생성 시작...\n');

  try {
    // 1. 숙박 - accommodation_rooms 테이블
    console.log('📍 1/5: 숙박 상품 생성 중...');
    const hotelResult = await connection.execute(`
      INSERT INTO accommodation_rooms (
        vendor_id, listing_id, name, description, room_type, bed_type, bed_count,
        size_sqm, capacity, base_price_per_night, weekend_surcharge,
        view_type, has_balcony, breakfast_included, wifi_available, tv_available,
        air_conditioning, city, address, thumbnail_url, images,
        min_nights, max_nights, is_available, created_at, updated_at
      ) VALUES (
        1, 354, '제주 오션뷰 호텔', '제주 바다가 한눈에 보이는 프리미엄 객실',
        'deluxe', 'double', 1, 35, 2, 150000, 30000,
        'ocean', 1, 1, 1, 1, 1, '제주시', '제주특별자치도 제주시 연동',
        'https://via.placeholder.com/400x300?text=Jeju+Ocean+View+Hotel',
        JSON_ARRAY('https://via.placeholder.com/800x600?text=Room1'),
        1, 30, 1, NOW(), NOW()
      )
    `);
    console.log(`   ✅ 숙박 상품 생성 완료 (ID: ${hotelResult.insertId})\n`);

    // 2. 음식점 - food_restaurants 테이블
    console.log('📍 2/5: 음식점 상품 생성 중...');
    const restaurantResult = await connection.execute(`
      INSERT INTO food_restaurants (
        vendor_id, restaurant_code, name, description, cuisine_type,
        food_categories, address, phone, operating_hours,
        table_count, seat_count, parking_available, accepts_reservations,
        accepts_takeout, accepts_delivery, table_order_enabled,
        thumbnail_url, images, estimated_visit_duration_minutes,
        city, is_active, created_at, updated_at
      ) VALUES (
        1, 'REST001', '서울 한식당', '전통 한식의 깊은 맛을 현대적으로 재해석',
        'korean', JSON_ARRAY('한식', '전통요리'),
        '서울특별시 종로구', '02-1234-5678',
        JSON_OBJECT('monday', '11:00-22:00', 'tuesday', '11:00-22:00'),
        15, 60, 1, 1, 1, 0, 1,
        'https://via.placeholder.com/400x300?text=Korean+Restaurant',
        JSON_ARRAY('https://via.placeholder.com/800x600?text=Restaurant1'),
        90, '서울', 1, NOW(), NOW()
      )
    `);
    console.log(`   ✅ 음식점 상품 생성 완료 (ID: ${restaurantResult.insertId})\n`);

    // 3. 관광지 - attractions 테이블
    console.log('📍 3/5: 관광지 상품 생성 중...');
    const attractionResult = await connection.execute(`
      INSERT INTO attractions (
        vendor_id, attraction_code, name, description, type, category,
        address, phone, operating_hours, admission_fee_adult, admission_fee_child,
        parking_available, wheelchair_accessible, thumbnail_url, images,
        estimated_visit_duration_minutes, city, is_active, created_at, updated_at
      ) VALUES (
        1, 'ATTR001', '경복궁 가이드 투어', '전문 문화해설사와 함께하는 경복궁 투어',
        'historical', '문화유산',
        '서울특별시 종로구 사직로 161', '02-3700-3900',
        JSON_OBJECT('monday', 'closed', 'tuesday', '09:00-18:00'),
        30000, 15000, 1, 1,
        'https://via.placeholder.com/400x300?text=Gyeongbokgung+Palace',
        JSON_ARRAY('https://via.placeholder.com/800x600?text=Palace1'),
        120, '서울', 1, NOW(), NOW()
      )
    `);
    console.log(`   ✅ 관광지 상품 생성 완료 (ID: ${attractionResult.insertId})\n`);

    // 4. 이벤트 - events 테이블
    console.log('📍 4/5: 이벤트 상품 생성 중...');
    const eventResult = await connection.execute(`
      INSERT INTO events (
        vendor_id, event_code, name, description, event_type, category,
        venue, venue_address, start_datetime, end_datetime,
        ticket_types, total_capacity, age_restriction,
        parking_available, wheelchair_accessible, thumbnail_url, images,
        location, is_active, created_at, updated_at
      ) VALUES (
        1, 'EVENT001', '서울 재즈 페스티벌', '세계적인 재즈 아티스트들과 함께하는 음악 축제',
        'concert', '음악',
        '올림픽공원', '서울특별시 송파구 올림픽로 424',
        DATE_ADD(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 32 DAY),
        JSON_ARRAY(
          JSON_OBJECT('name', '일반', 'price', 80000, 'available', 500)
        ),
        1000, '전체관람가', 1, 1,
        'https://via.placeholder.com/400x300?text=Jazz+Festival',
        JSON_ARRAY('https://via.placeholder.com/800x600?text=Festival1'),
        '서울', 1, NOW(), NOW()
      )
    `);
    console.log(`   ✅ 이벤트 상품 생성 완료 (ID: ${eventResult.insertId})\n`);

    // 5. 체험 - experiences 테이블
    console.log('📍 5/5: 체험 상품 생성 중...');
    const experienceResult = await connection.execute(`
      INSERT INTO experiences (
        vendor_id, experience_code, name, description, experience_type, category,
        location, city, duration_minutes, min_participants, max_participants,
        price_per_person_krw, child_price_krw, language, difficulty_level,
        age_restriction, thumbnail_url, images, is_active, created_at, updated_at
      ) VALUES (
        1, 'EXP001', '한옥마을 전통문화 체험', '한복, 전통 차, 한지 공예를 포함한 3시간 코스',
        'cultural', '전통문화',
        '전주 한옥마을', '전주', 180, 2, 10,
        45000, 30000, '한국어', 'easy', '전체',
        'https://via.placeholder.com/400x300?text=Hanok+Experience',
        JSON_ARRAY('https://via.placeholder.com/800x600?text=Experience1'),
        1, NOW(), NOW()
      )
    `);
    console.log(`   ✅ 체험 상품 생성 완료 (ID: ${experienceResult.insertId})\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 모든 카테고리 테스트 상품 생성 완료!\n');
    console.log('📊 생성된 상품:');
    console.log(`  - 숙박 (accommodation_rooms): ID ${hotelResult.insertId}`);
    console.log(`  - 음식점 (food_restaurants): ID ${restaurantResult.insertId}`);
    console.log(`  - 관광지 (attractions): ID ${attractionResult.insertId}`);
    console.log(`  - 이벤트 (events): ID ${eventResult.insertId}`);
    console.log(`  - 체험 (experiences): ID ${experienceResult.insertId}\n`);

    console.log('🌐 테스트 URL:');
    console.log(`  숙박: https://travelap.vercel.app/accommodation`);
    console.log(`  음식점: https://travelap.vercel.app/food`);
    console.log(`  관광지: https://travelap.vercel.app/attractions`);
    console.log(`  이벤트: https://travelap.vercel.app/events`);
    console.log(`  체험: https://travelap.vercel.app/experience`);

  } catch (error) {
    console.error('❌ 에러:', error.message);
    console.error('상세:', error);
    throw error;
  }
}

createCategoryProducts().then(() => {
  console.log('\n✅ 완료');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ 실패');
  process.exit(1);
});
