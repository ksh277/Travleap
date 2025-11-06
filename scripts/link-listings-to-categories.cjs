const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function linkListingsToCategories() {
  console.log('🔗 listings 상품(354-358)을 카테고리 테이블에 연결 중...\n');

  try {
    // 1. 숙박 (ID 354) → listing_accommodation
    console.log('📍 1/5: 숙박 상품 (ID 354) 연결 중...');
    const accomResult = await connection.execute(`
      INSERT INTO listing_accommodation (
        listing_id, room_type, max_guests, check_in_time, check_out_time,
        amenities, bed_type, bathroom_type, room_size,
        wifi_available, parking_available, breakfast_included,
        cancellation_policy, house_rules, created_at, updated_at
      ) VALUES (
        354, 'deluxe', 2, '15:00:00', '11:00:00',
        JSON_ARRAY('wifi', 'tv', 'air_conditioning', 'ocean_view'),
        'queen', 'private', 35.00,
        1, 1, 1,
        '체크인 3일 전까지 무료 취소 가능',
        '금연, 반려동물 불가',
        NOW(), NOW()
      )
    `);
    console.log(`   ✅ listing_accommodation 레코드 생성 (ID: ${accomResult.insertId})\n`);

    // 2. 음식점 (ID 355) → listing_food
    console.log('📍 2/5: 음식점 상품 (ID 355) 연결 중...');
    const foodResult = await connection.execute(`
      INSERT INTO listing_food (
        listing_id, cuisine_type, opening_hours, menu_items,
        price_range, reservations_required, parking_available,
        seating_capacity, delivery_available, takeout_available,
        alcohol_served, kid_friendly, specialty_dishes, chef_info,
        created_at, updated_at
      ) VALUES (
        355, 'korean',
        JSON_OBJECT('monday', '11:00-22:00', 'tuesday', '11:00-22:00', 'wednesday', '11:00-22:00',
                    'thursday', '11:00-22:00', 'friday', '11:00-22:00', 'saturday', '11:00-22:00', 'sunday', '11:00-21:00'),
        JSON_ARRAY(
          JSON_OBJECT('name', '한정식', 'price', 50000, 'description', '전통 한정식 정찬'),
          JSON_OBJECT('name', '불고기', 'price', 35000, 'description', '한우 불고기')
        ),
        'expensive', 1, 1,
        60, 0, 1,
        1, 1, '전통 한정식, 한우 불고기', '30년 경력의 한식 셰프',
        NOW(), NOW()
      )
    `);
    console.log(`   ✅ listing_food 레코드 생성 (ID: ${foodResult.insertId})\n`);

    // 3. 관광지 (ID 356) - listings 테이블에만 있으면 됨 (listing_tour 테이블 없음)
    console.log('📍 3/5: 관광지 상품 (ID 356) - listings 테이블에만 존재하면 됨\n');

    // 4. 이벤트 (ID 357) → listing_event
    console.log('📍 4/5: 이벤트 상품 (ID 357) 연결 중...');
    const eventResult = await connection.execute(`
      INSERT INTO listing_event (
        listing_id, event_type, start_date, end_date, event_times,
        ticket_types, venue_info, venue_address, organizer,
        age_restriction, dress_code, language, accessibility_info,
        refund_policy, contact_info, created_at, updated_at
      ) VALUES (
        357, 'concert',
        DATE_ADD(CURDATE(), INTERVAL 30 DAY),
        DATE_ADD(CURDATE(), INTERVAL 32 DAY),
        JSON_ARRAY(
          JSON_OBJECT('date', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'time', '19:00:00'),
          JSON_OBJECT('date', DATE_ADD(CURDATE(), INTERVAL 31 DAY), 'time', '19:00:00')
        ),
        JSON_ARRAY(
          JSON_OBJECT('type', '일반석', 'price', 80000, 'available', 500),
          JSON_OBJECT('type', 'VIP석', 'price', 150000, 'available', 100)
        ),
        '올림픽공원 체조경기장', '서울특별시 송파구 올림픽로 424', '서울 재즈 협회',
        '전체관람가', 'casual', 'Korean', '휠체어 접근 가능',
        '공연 7일 전까지 100% 환불',
        JSON_OBJECT('phone', '02-1234-5678', 'email', 'info@jazzfestival.kr'),
        NOW(), NOW()
      )
    `);
    console.log(`   ✅ listing_event 레코드 생성 (ID: ${eventResult.insertId})\n`);

    // 5. 체험 (ID 358) - listings 테이블에만 있으면 됨
    console.log('📍 5/5: 체험 상품 (ID 358) - listings 테이블에만 존재하면 됨\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 모든 상품이 카테고리 테이블에 연결되었습니다!\n');

    console.log('📊 생성된 연결:');
    console.log(`  - 숙박 (listings.id=354) → listing_accommodation.id=${accomResult.insertId}`);
    console.log(`  - 음식점 (listings.id=355) → listing_food.id=${foodResult.insertId}`);
    console.log(`  - 관광지 (listings.id=356) → listings 테이블만 사용`);
    console.log(`  - 이벤트 (listings.id=357) → listing_event.id=${eventResult.insertId}`);
    console.log(`  - 체험 (listings.id=358) → listings 테이블만 사용\n`);

    console.log('🌐 이제 각 카테고리 페이지에서 상품을 확인할 수 있습니다:');
    console.log(`  https://travelap.vercel.app/accommodation`);
    console.log(`  https://travelap.vercel.app/food`);
    console.log(`  https://travelap.vercel.app/attractions`);
    console.log(`  https://travelap.vercel.app/events`);
    console.log(`  https://travelap.vercel.app/experience`);

  } catch (error) {
    console.error('❌ 에러:', error.message);
    console.error('상세:', error);
    throw error;
  }
}

linkListingsToCategories().then(() => {
  console.log('\n✅ 완료');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ 실패');
  process.exit(1);
});
