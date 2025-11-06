/**
 * 테스트 상품 생성 스크립트 (listings만)
 *
 * 카테고리별로 테스트 데이터 생성:
 * - 숙박 (숙박)
 * - 음식점 (음식점)
 * - 관광지 (관광지)
 * - 이벤트 (이벤트)
 * - 체험 (체험)
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function createTestProducts() {
  console.log('🚀 테스트 상품 생성 시작...\n');

  try {
    // 1. 숙박 (Accommodation)
    console.log('📍 1. 숙박 카테고리 생성 중...');

    const hotelResult = await connection.execute(`
      INSERT INTO listings (
        user_id, title, description, category, price_from, price_to,
        address, latitude, longitude, images, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      1,
      '제주 오션뷰 호텔 - 디럭스 더블룸',
      '넓은 창문으로 제주 바다의 아름다운 전망을 감상할 수 있는 디럭스 더블룸입니다. 킹사이즈 베드와 고급 침구류, 욕실에는 레인 샤워기가 구비되어 있습니다.\n\n시설:\n- WiFi 무료\n- 주차 가능\n- 조식 포함\n- 수영장\n- 오션뷰\n- 룸서비스',
      '숙박',
      150000,
      200000,
      '제주특별자치도 제주시 애월읍 해안로 123',
      33.4996,
      126.4667,
      JSON.stringify([
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
      ]),
      1
    ]);

    console.log(`✅ 호텔 상품 생성 완료 (ID: ${hotelResult.insertId})\n`);

    // 2. 음식점 (Food)
    console.log('🍴 2. 음식점 카테고리 생성 중...');

    const foodResult = await connection.execute(`
      INSERT INTO listings (
        user_id, title, description, category, price_from, price_to,
        address, latitude, longitude, images, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      1,
      '서울 한식당 - 프리미엄 한정식 코스',
      '제철 식재료로 정성스럽게 준비한 12첩 한정식입니다. 전통 한식의 깊은 맛을 현대적으로 재해석했습니다.\n\n특징:\n- 프라이빗 룸\n- 주차 가능\n- 예약 필수\n- 전통 한식\n- 고급 한정식',
      '음식점',
      50000,
      80000,
      '서울특별시 강남구 테헤란로 123',
      37.5665,
      127.0490,
      JSON.stringify([
        'https://images.unsplash.com/photo-1580867335191-cca04e0d54c6?w=800',
        'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=800',
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800'
      ]),
      1
    ]);

    console.log(`✅ 음식점 상품 생성 완료 (ID: ${foodResult.insertId})\n`);

    // 3. 관광지 (Attractions)
    console.log('🏛️ 3. 관광지 카테고리 생성 중...');

    const attractionResult = await connection.execute(`
      INSERT INTO listings (
        user_id, title, description, category, price_from, price_to,
        address, latitude, longitude, images, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      1,
      '경복궁 가이드 투어',
      '전문 문화해설사와 함께하는 경복궁 투어입니다. 근정전, 경회루, 향원정 등 주요 전각을 둘러보며 조선시대의 역사를 생생하게 경험하실 수 있습니다.\n\n특징:\n- 가이드 투어\n- 문화 체험\n- 포토 스팟\n- 역사 교육\n- 오디오 가이드',
      '관광지',
      30000,
      50000,
      '서울특별시 종로구 사직로 161',
      37.5788,
      126.9770,
      JSON.stringify([
        'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
        'https://images.unsplash.com/photo-1578193661809-a654e09d9f2e?w=800',
        'https://images.unsplash.com/photo-1604129454997-8c0bd0b90b26?w=800'
      ]),
      1
    ]);

    console.log(`✅ 관광지 상품 생성 완료 (ID: ${attractionResult.insertId})\n`);

    // 4. 이벤트 (Events)
    console.log('🎉 4. 이벤트 카테고리 생성 중...');

    const eventResult = await connection.execute(`
      INSERT INTO listings (
        user_id, title, description, category, price_from, price_to,
        address, latitude, longitude, images, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      1,
      '서울 재즈 페스티벌 2025',
      '세계적인 재즈 아티스트들과 함께하는 3일간의 음악 축제입니다. 메인 무대와 서브 무대에서 다양한 재즈 장르를 즐기실 수 있습니다.\n\n특징:\n- 페스티벌\n- 야외 공연\n- 푸드존\n- 주차 가능\n- 다중 무대',
      '이벤트',
      80000,
      150000,
      '서울특별시 마포구 상암동 월드컵공원',
      37.5665,
      126.8971,
      JSON.stringify([
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'
      ]),
      1
    ]);

    console.log(`✅ 이벤트 상품 생성 완료 (ID: ${eventResult.insertId})\n`);

    // 5. 체험 (Experience)
    console.log('🎨 5. 체험 카테고리 생성 중...');

    const experienceResult = await connection.execute(`
      INSERT INTO listings (
        user_id, title, description, category, price_from, price_to,
        address, latitude, longitude, images, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      1,
      '한옥마을 전통문화 체험 패키지',
      '한복 입기, 전통 차 시음, 한지 공예 만들기를 포함한 3시간 코스입니다. 전문 강사의 설명과 함께 한국 전통문화를 깊이 있게 체험하실 수 있습니다.\n\n특징:\n- 한복 대여\n- 전통 차\n- 공예 체험\n- 사진 서비스\n- 한국 문화',
      '체험',
      45000,
      65000,
      '전라북도 전주시 완산구 은행로 123',
      35.8156,
      127.1530,
      JSON.stringify([
        'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
        'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
        'https://images.unsplash.com/photo-1548013146-72479768bada?w=800'
      ]),
      1
    ]);

    console.log(`✅ 체험 상품 생성 완료 (ID: ${experienceResult.insertId})\n`);

    // 생성된 데이터 요약
    console.log('\n✅ 전체 테스트 데이터 생성 완료!');
    console.log('\n📊 생성된 데이터 요약:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`1. 숙박 - 제주 오션뷰 호텔 (Listing ID: ${hotelResult.insertId})`);
    console.log(`2. 음식점 - 서울 한식당 (Listing ID: ${foodResult.insertId})`);
    console.log(`3. 관광지 - 경복궁 투어 (Listing ID: ${attractionResult.insertId})`);
    console.log(`4. 이벤트 - 서울 재즈 페스티벌 (Listing ID: ${eventResult.insertId})`);
    console.log(`5. 체험 - 한옥마을 전통문화체험 (Listing ID: ${experienceResult.insertId})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔗 로컬 테스트 URL:');
    console.log(`- 숙박: http://localhost:5173/hotel/${hotelResult.insertId}`);
    console.log(`- 음식점: http://localhost:5173/restaurant/${foodResult.insertId}`);
    console.log(`- 관광지: http://localhost:5173/attraction/${attractionResult.insertId}`);
    console.log(`- 이벤트: http://localhost:5173/event/${eventResult.insertId}`);
    console.log(`- 체험: http://localhost:5173/experience/${experienceResult.insertId}`);

    console.log('\n🌐 프로덕션 URL:');
    console.log(`- 숙박: https://travelap.vercel.app/hotel/${hotelResult.insertId}`);
    console.log(`- 음식점: https://travelap.vercel.app/restaurant/${foodResult.insertId}`);
    console.log(`- 관광지: https://travelap.vercel.app/attraction/${attractionResult.insertId}`);
    console.log(`- 이벤트: https://travelap.vercel.app/event/${eventResult.insertId}`);
    console.log(`- 체험: https://travelap.vercel.app/experience/${experienceResult.insertId}\n`);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

// 스크립트 실행
createTestProducts()
  .then(() => {
    console.log('✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
