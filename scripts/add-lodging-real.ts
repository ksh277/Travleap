// 실제 DB에 숙박 업체 추가 (인증 없이 직접 DB 접근)
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function addLodgingVendors() {
  console.log('🏨 숙박 업체 실제 DB 추가 시작\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다');
    return;
  }

  const db = connect({ url: process.env.DATABASE_URL });

  try {
    // ===== 1. CSV 방식 업체 추가 =====
    console.log('📋 1. CSV 방식 - 신안 바다뷰 펜션');

    const csvVendor = await db.execute(`
      INSERT INTO partners (
        user_id, business_name, contact_name, phone, email,
        is_active, is_verified, is_featured,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      1, // test user_id
      '신안 바다뷰 펜션',
      '김철수',
      '010-1234-5678',
      'seaview@test.com',
      1, 1, 0
    ]);

    const csvVendorId = csvVendor.insertId;
    console.log(`   ✅ 업체 생성 완료 (ID: ${csvVendorId})`);

    // CSV 방식 객실 3개 추가
    const csvRooms = [
      {
        name: '오션뷰 스위트',
        description: '넓은 오션뷰와 킹사이즈 침대를 갖춘 프리미엄 객실',
        price: 150000,
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
      },
      {
        name: '스탠다드 더블',
        description: '깔끔한 더블룸',
        price: 100000,
        image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'
      },
      {
        name: '패밀리 룸',
        description: '가족 단위 최적 넓은 공간',
        price: 200000,
        image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'
      }
    ];

    for (const room of csvRooms) {
      await db.execute(`
        INSERT INTO listings (
          partner_id, category_id, listing_name, description,
          location, address, price_from,
          images, is_published, is_active,
          rating_avg, rating_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        csvVendorId,
        1857,
        room.name,
        room.description,
        '신안군',
        '전라남도 신안군 증도면 해안로 123',
        room.price,
        JSON.stringify([room.image]),
        1, 1,
        4.8, 25
      ]);

      console.log(`   ✅ 객실 추가: ${room.name}`);
    }

    console.log('\n');

    // ===== 2. PMS 방식 업체 추가 =====
    console.log('📋 2. PMS 방식 - 증도 힐링 호텔');

    const pmsVendor = await db.execute(`
      INSERT INTO partners (
        user_id, business_name, contact_name, phone, email,
        is_active, is_verified, is_featured,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      1, // test user_id
      '증도 힐링 호텔',
      '박민수',
      '010-9876-5432',
      'healing@test.com',
      1, 1, 0
    ]);

    const pmsVendorId = pmsVendor.insertId;
    console.log(`   ✅ 업체 생성 완료 (ID: ${pmsVendorId})`);

    // PMS 방식 객실 3개 추가
    const pmsRooms = [
      {
        name: '디럭스 트윈',
        description: '편안한 트윈 침대',
        price: 130000,
        image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'
      },
      {
        name: '이그제큐티브 스위트',
        description: '최고급 스위트룸',
        price: 220000,
        image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
      },
      {
        name: '스탠다드 싱글',
        description: '1인 여행객을 위한 객실',
        price: 80000,
        image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'
      }
    ];

    for (const room of pmsRooms) {
      await db.execute(`
        INSERT INTO listings (
          partner_id, category_id, listing_name, description,
          location, address, price_from,
          images, is_published, is_active,
          rating_avg, rating_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        pmsVendorId,
        1857,
        room.name,
        room.description,
        '증도',
        '전라남도 신안군 증도면 힐링로 456',
        room.price,
        JSON.stringify([room.image]),
        1, 1,
        4.7, 20
      ]);

      console.log(`   ✅ 객실 추가: ${room.name}`);
    }

    console.log('\n');

    // ===== 3. 확인 =====
    console.log('📋 3. 추가된 데이터 확인');

    const result = await db.execute(`
      SELECT
        p.id,
        p.business_name,
        COUNT(l.id) as room_count,
        MIN(l.price_from) as min_price,
        MAX(l.price_from) as max_price
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = 1857
      WHERE p.id IN (?, ?)
      GROUP BY p.id, p.business_name
    `, [csvVendorId, pmsVendorId]);

    console.log('\n   추가된 업체:');
    result.rows.forEach((row: any) => {
      console.log(`   - ${row.business_name}`);
      console.log(`     객실: ${row.room_count}개, 가격: ${row.min_price?.toLocaleString()}원 ~ ${row.max_price?.toLocaleString()}원`);
    });

    console.log('\n');

    // ===== 4. 공개 API 테스트 =====
    console.log('📋 4. 공개 API 테스트 (/api/accommodations)');

    const apiResponse = await fetch('http://localhost:3004/api/accommodations');
    const apiData = await apiResponse.json();

    if (apiData.success && apiData.data) {
      console.log(`   ✅ 총 ${apiData.data.length}개 숙박 업체 조회됨\n`);

      const csvFound = apiData.data.find((v: any) => v.business_name === '신안 바다뷰 펜션');
      const pmsFound = apiData.data.find((v: any) => v.business_name === '증도 힐링 호텔');

      if (csvFound) {
        console.log(`   ✅ CSV 업체 확인: ${csvFound.business_name} (${csvFound.room_count}개 객실)`);
      } else {
        console.log(`   ❌ CSV 업체가 공개 API에서 보이지 않습니다`);
      }

      if (pmsFound) {
        console.log(`   ✅ PMS 업체 확인: ${pmsFound.business_name} (${pmsFound.room_count}개 객실)`);
      } else {
        console.log(`   ❌ PMS 업체가 공개 API에서 보이지 않습니다`);
      }
    }

    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 완료! 배포 사이트에서 확인하세요:');
    console.log('   - 신안 바다뷰 펜션 (CSV 방식, 3개 객실)');
    console.log('   - 증도 힐링 호텔 (PMS 방식, 3개 객실)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

addLodgingVendors();
