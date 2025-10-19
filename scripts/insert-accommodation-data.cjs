/**
 * 숙박 데이터 대량 삽입 스크립트
 * 2개 벤더: CSV 대량 (36개 객실) + PMS 연동 (22개 객실)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// 벤더 1: 신안 비치 호텔 (CSV 방식) - 6개 숙소, 36개 객실
const VENDOR1_PROPERTIES = [
  {
    name: '신안 비치 호텔',
    type: 'hotel',
    description: '아름다운 바다 전망과 함께하는 프리미엄 비치 호텔',
    address: '전라남도 신안군 압해읍 해안로 123',
    rating: 4.5,
    rooms: [
      { name: '디럭스 더블룸', type: 'double', capacity: 2, price: 120000, count: 5 },
      { name: '디럭스 트윈룸', type: 'twin', capacity: 2, price: 115000, count: 4 },
      { name: '슈페리어 더블룸', type: 'double', capacity: 2, price: 95000, count: 6 },
      { name: '패밀리 스위트', type: 'suite', capacity: 4, price: 250000, count: 3 },
      { name: '오션뷰 스위트', type: 'suite', capacity: 2, price: 280000, count: 2 },
      { name: '스탠다드 트윈룸', type: 'twin', capacity: 2, price: 85000, count: 4 }
    ]
  },
  {
    name: '압해도 게스트하우스',
    type: 'guesthouse',
    description: '가성비 좋은 깔끔한 게스트하우스',
    address: '전라남도 신안군 압해읍 중앙로 45',
    rating: 4.2,
    rooms: [
      { name: '프라이빗 더블룸', type: 'double', capacity: 2, price: 55000, count: 3 },
      { name: '도미토리 4인실', type: 'dormitory', capacity: 4, price: 25000, count: 2 },
      { name: '패밀리룸', type: 'family', capacity: 4, price: 90000, count: 2 }
    ]
  },
  {
    name: '천사대교 리조트',
    type: 'resort',
    description: '천사대교가 보이는 특급 리조트',
    address: '전라남도 신안군 압해읍 천사로 789',
    rating: 4.7,
    rooms: [
      { name: '스탠다드 콘도', type: 'condo', capacity: 4, price: 180000, count: 8 },
      { name: '디럭스 콘도', type: 'condo', capacity: 6, price: 250000, count: 4 },
      { name: '펜트하우스', type: 'penthouse', capacity: 8, price: 450000, count: 1 }
    ]
  },
  {
    name: '증도 슬로시티 펜션',
    type: 'pension',
    description: '느림의 미학, 슬로시티 증도의 아늑한 펜션',
    address: '전라남도 신안군 증도면 보물섬길 321',
    rating: 4.3,
    rooms: [
      { name: 'A동 독채', type: 'house', capacity: 6, price: 150000, count: 3 },
      { name: 'B동 독채', type: 'house', capacity: 4, price: 120000, count: 4 },
      { name: 'C동 독채', type: 'house', capacity: 8, price: 200000, count: 2 }
    ]
  },
  {
    name: '흑산도 선착장 모텔',
    type: 'motel',
    description: '흑산도 선착장 인근 편리한 모텔',
    address: '전라남도 신안군 흑산면 예리길 56',
    rating: 3.8,
    rooms: [
      { name: '스탠다드룸', type: 'double', capacity: 2, price: 60000, count: 8 },
      { name: '디럭스룸', type: 'double', capacity: 2, price: 75000, count: 4 }
    ]
  },
  {
    name: '홍도 해상 방갈로',
    type: 'bungalow',
    description: '홍도 절경을 감상할 수 있는 바다 위 방갈로',
    address: '전라남도 신안군 흑산면 홍도리 100',
    rating: 4.6,
    rooms: [
      { name: '씨뷰 방갈로', type: 'bungalow', capacity: 2, price: 130000, count: 5 },
      { name: '선셋 방갈로', type: 'bungalow', capacity: 2, price: 150000, count: 3 }
    ]
  }
];

// 벤더 2: 목포 스테이 (PMS 연동 방식) - 22개 객실
const VENDOR2_PROPERTIES = [
  {
    name: '목포 하버뷰 호텔',
    type: 'hotel',
    description: 'PMS 연동 - CloudBeds로 자동 관리되는 스마트 호텔',
    address: '전라남도 목포시 평화로 234',
    rating: 4.4,
    pms_provider: 'cloudbeds',
    pms_hotel_id: 'MPO_HARBOR_001',
    rooms: [
      { name: '스탠다드 싱글', type: 'single', capacity: 1, price: 70000, count: 6 },
      { name: '스탠다드 더블', type: 'double', capacity: 2, price: 95000, count: 8 },
      { name: '비즈니스 스위트', type: 'suite', capacity: 2, price: 180000, count: 4 },
      { name: '이그제큐티브 스위트', type: 'suite', capacity: 4, price: 300000, count: 2 },
      { name: '패밀리 트윈', type: 'twin', capacity: 3, price: 130000, count: 2 }
    ]
  }
];

async function insertAccommodationData() {
  let connection;

  try {
    console.log('🔌 데이터베이스 연결 중...');
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: {
        rejectUnauthorized: true
      }
    });

    console.log('✅ 데이터베이스 연결 성공!');

    // ============================================
    // VENDOR 1: 신안 비치 호텔 그룹 (CSV 방식)
    // ============================================
    console.log('\n📋 [벤더 1] 신안 비치 호텔 그룹 확인 중...');

    // 기존 partner 사용 또는 새로 생성
    const [existingPartners] = await connection.execute(
      `SELECT id FROM partners ORDER BY id DESC LIMIT 1`
    );

    let vendor1Id;
    if (existingPartners.length > 0) {
      vendor1Id = existingPartners[0].id;
      console.log(`✅ 기존 파트너 사용 (ID: ${vendor1Id})`);
    } else {
      // 이 경우는 발생하지 않을 것으로 예상
      throw new Error('파트너가 없습니다. 먼저 파트너를 생성해주세요.');
    }

    // 벤더 1의 숙소 및 객실 등록
    let totalRoomsVendor1 = 0;
    for (const property of VENDOR1_PROPERTIES) {
      console.log(`\n📦 [${property.name}] 등록 중...`);

      // listings 테이블에 숙소 등록
      const [listingResult] = await connection.execute(
        `INSERT INTO listings (
          partner_id, category_id, title, short_description, description_md,
          location, address, price_from, price_to, duration, max_capacity,
          is_published, is_active, is_featured,
          images, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, NOW(), NOW())`,
        [
          vendor1Id,
          2, // accommodation category
          property.name,
          property.description,
          `# ${property.name}\n\n${property.description}\n\n## 위치\n${property.address}`,
          '신안군, 전라남도',
          property.address,
          Math.min(...property.rooms.map(r => r.price)),
          Math.max(...property.rooms.map(r => r.price)),
          '1박',
          Math.max(...property.rooms.map(r => r.capacity)),
          JSON.stringify([
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
          ])
        ]
      );
      const listingId = listingResult.insertId;

      // 각 객실 타입을 별도 listing으로 등록
      for (const room of property.rooms) {
        const roomListingTitle = `${property.name} - ${room.name}`;

        await connection.execute(
          `INSERT INTO listings (
            partner_id, category_id, title, short_description, description_md,
            location, address, price_from, price_to, duration, max_capacity,
            is_published, is_active, is_featured,
            available_spots, images, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, ?, NOW(), NOW())`,
          [
            vendor1Id,
            2, // accommodation category
            roomListingTitle,
            `${room.name} (${room.type}) - 최대 ${room.capacity}인`,
            `# ${roomListingTitle}\n\n## 객실 정보\n- 타입: ${room.type}\n- 최대 인원: ${room.capacity}명\n- 가격: ₩${room.price.toLocaleString()}/박\n- 재고: ${room.count}개`,
            '신안군, 전라남도',
            property.address,
            room.price,
            room.price,
            '1박',
            room.capacity,
            room.count, // available_spots를 객실 수로 사용
            JSON.stringify([
              'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600',
              'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600'
            ])
          ]
        );

        totalRoomsVendor1 += room.count;
        console.log(`  ✓ ${room.name} (${room.count}개 객실) 등록 완료`);
      }
    }

    console.log(`\n✅ [벤더 1] 총 ${VENDOR1_PROPERTIES.length}개 숙소, ${totalRoomsVendor1}개 객실 등록 완료!`);

    // ============================================
    // VENDOR 2: 목포 스테이 (PMS 연동)
    // ============================================
    console.log('\n📋 [벤더 2] 목포 스테이 (PMS 연동) 확인 중...');

    // 두 번째 파트너도 동일하게 기존 것 사용 (데이터가 섞이지만 테스트용)
    const vendor2Id = vendor1Id;
    console.log(`✅ 기존 파트너 사용 (ID: ${vendor2Id})`);

    // 벤더 2의 숙소 및 객실 등록
    let totalRoomsVendor2 = 0;
    for (const property of VENDOR2_PROPERTIES) {
      console.log(`\n📦 [${property.name}] (PMS: ${property.pms_provider}) 등록 중...`);

      // listings 테이블에 숙소 등록
      const [listingResult] = await connection.execute(
        `INSERT INTO listings (
          partner_id, category_id, title, short_description, description_md,
          location, address, price_from, price_to, duration, max_capacity,
          is_published, is_active, is_featured,
          images, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, NOW(), NOW())`,
        [
          vendor2Id,
          2, // accommodation category
          property.name,
          property.description,
          `# ${property.name}\n\n${property.description}\n\n## PMS 연동\n- Provider: ${property.pms_provider}\n- Hotel ID: ${property.pms_hotel_id}\n\n## 위치\n${property.address}`,
          '목포시, 전라남도',
          property.address,
          Math.min(...property.rooms.map(r => r.price)),
          Math.max(...property.rooms.map(r => r.price)),
          '1박',
          Math.max(...property.rooms.map(r => r.capacity)),
          JSON.stringify([
            'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
            'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'
          ])
        ]
      );
      const listingId = listingResult.insertId;

      // 각 객실 타입을 별도 listing으로 등록 (PMS 연동 방식)
      for (const room of property.rooms) {
        const roomListingTitle = `${property.name} - ${room.name} [PMS]`;

        await connection.execute(
          `INSERT INTO listings (
            partner_id, category_id, title, short_description, description_md,
            location, address, price_from, price_to, duration, max_capacity,
            is_published, is_active, is_featured,
            available_spots, images, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, ?, NOW(), NOW())`,
          [
            vendor2Id,
            2, // accommodation category
            roomListingTitle,
            `${room.name} (${room.type}) - 최대 ${room.capacity}인 [PMS 자동 관리]`,
            `# ${roomListingTitle}\n\n## 객실 정보 (PMS 연동)\n- 타입: ${room.type}\n- 최대 인원: ${room.capacity}명\n- 가격: ₩${room.price.toLocaleString()}/박\n- 재고: ${room.count}개\n\n**CloudBeds PMS로 자동 관리됩니다**`,
            '목포시, 전라남도',
            property.address,
            room.price,
            room.price,
            '1박',
            room.capacity,
            room.count,
            JSON.stringify([
              'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600',
              'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600'
            ])
          ]
        );

        totalRoomsVendor2 += room.count;
        console.log(`  ✓ ${room.name} (${room.count}개 객실) [PMS] 등록 완료`);
      }
    }

    console.log(`\n✅ [벤더 2] 총 ${VENDOR2_PROPERTIES.length}개 숙소, ${totalRoomsVendor2}개 객실 등록 완료!`);

    // ============================================
    // 최종 요약
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 숙박 데이터 삽입 완료!');
    console.log('='.repeat(60));
    console.log(`\n📊 벤더 1 (CSV 방식): 신안 비치 호텔 그룹`);
    console.log(`   - 숙소: ${VENDOR1_PROPERTIES.length}개`);
    console.log(`   - 객실: ${totalRoomsVendor1}개`);
    console.log(`   - 방식: CSV 대량 업로드`);

    console.log(`\n📊 벤더 2 (PMS 연동): 목포 스테이`);
    console.log(`   - 숙소: ${VENDOR2_PROPERTIES.length}개`);
    console.log(`   - 객실: ${totalRoomsVendor2}개`);
    console.log(`   - 방식: PMS 자동 연동 (CloudBeds)`);

    console.log(`\n📈 전체 통계:`);
    console.log(`   - 총 벤더: 2개`);
    console.log(`   - 총 숙소: ${VENDOR1_PROPERTIES.length + VENDOR2_PROPERTIES.length}개`);
    console.log(`   - 총 객실: ${totalRoomsVendor1 + totalRoomsVendor2}개`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
insertAccommodationData()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
