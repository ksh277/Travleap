// 최종 - 실제 DB에 숙박 업체와 객실 추가
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function addLodgingFinal() {
  console.log('🏨 실제 DB에 숙박 데이터 추가 시작\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL이 없습니다');
    return;
  }

  const db = connect({ url: process.env.DATABASE_URL });

  try {
    // 먼저 listings 테이블 구조 확인
    console.log('📋 listings 테이블 구조 확인...');
    const columns = await db.execute('SHOW COLUMNS FROM listings');

    console.log('\n사용 가능한 컬럼:');
    const columnNames = columns.rows.map((r: any) => r.Field);
    columnNames.forEach((name: string) => console.log(`  - ${name}`));

    // title 또는 name 또는 listing_name 찾기
    let nameColumn = 'title';
    if (columnNames.includes('name')) nameColumn = 'name';
    if (columnNames.includes('listing_name')) nameColumn = 'listing_name';

    console.log(`\n✅ 객실 이름 컬럼: ${nameColumn}\n`);

    // ===== 1. 신안 바다뷰 펜션 =====
    console.log('📋 1. 신안 바다뷰 펜션 추가');

    const vendor1 = await db.execute(`
      INSERT INTO partners (user_id, business_name, contact_name, phone, email, is_active, is_verified, is_featured, created_at, updated_at)
      VALUES (1, '신안 바다뷰 펜션', '김철수', '010-1234-5678', 'seaview@test.com', 1, 1, 0, NOW(), NOW())
    `);

    const vendor1Id = vendor1.insertId;
    console.log(`   ✅ 업체 생성 (ID: ${vendor1Id})`);

    // 객실 3개
    const rooms1 = [
      { name: '오션뷰 스위트', desc: '넓은 오션뷰와 킹사이즈 침대', price: 150000, img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800' },
      { name: '스탠다드 더블', desc: '깔끔한 더블룸', price: 100000, img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800' },
      { name: '패밀리 룸', desc: '가족 단위 최적', price: 200000, img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800' }
    ];

    for (const room of rooms1) {
      await db.execute(`
        INSERT INTO listings (
          partner_id, category_id, ${nameColumn}, short_description,
          location, address, price_from, images,
          is_published, is_active, rating_avg, rating_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendor1Id, 1857, room.name, room.desc,
        '신안군', '전라남도 신안군 증도면 해안로 123',
        room.price, JSON.stringify([room.img]),
        1, 1, 4.8, 25
      ]);
      console.log(`   ✅ 객실: ${room.name}`);
    }

    console.log('\n');

    // ===== 2. 증도 힐링 호텔 =====
    console.log('📋 2. 증도 힐링 호텔 추가');

    const vendor2 = await db.execute(`
      INSERT INTO partners (user_id, business_name, contact_name, phone, email, is_active, is_verified, is_featured, created_at, updated_at)
      VALUES (1, '증도 힐링 호텔', '박민수', '010-9876-5432', 'healing@test.com', 1, 1, 0, NOW(), NOW())
    `);

    const vendor2Id = vendor2.insertId;
    console.log(`   ✅ 업체 생성 (ID: ${vendor2Id})`);

    // 객실 3개
    const rooms2 = [
      { name: '디럭스 트윈', desc: '편안한 트윈 침대', price: 130000, img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800' },
      { name: '이그제큐티브 스위트', desc: '최고급 스위트룸', price: 220000, img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800' },
      { name: '스탠다드 싱글', desc: '1인 여행객', price: 80000, img: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800' }
    ];

    for (const room of rooms2) {
      await db.execute(`
        INSERT INTO listings (
          partner_id, category_id, ${nameColumn}, short_description,
          location, address, price_from, images,
          is_published, is_active, rating_avg, rating_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendor2Id, 1857, room.name, room.desc,
        '증도', '전라남도 신안군 증도면 힐링로 456',
        room.price, JSON.stringify([room.img]),
        1, 1, 4.7, 20
      ]);
      console.log(`   ✅ 객실: ${room.name}`);
    }

    console.log('\n');

    // ===== 3. DB에서 확인 =====
    console.log('📋 3. DB 확인');
    const result = await db.execute(`
      SELECT p.id, p.business_name, COUNT(l.id) as cnt, MIN(l.price_from) as min_p, MAX(l.price_from) as max_p
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = 1857
      WHERE p.id IN (?, ?)
      GROUP BY p.id, p.business_name
    `, [vendor1Id, vendor2Id]);

    console.log('   DB에 저장된 데이터:');
    result.rows.forEach((r: any) => {
      console.log(`   - ${r.business_name}: ${r.cnt}개 객실, ${r.min_p?.toLocaleString()}원~${r.max_p?.toLocaleString()}원`);
    });

    console.log('\n');

    // ===== 4. API 테스트 (배포 사이트) =====
    console.log('📋 4. 배포 사이트 API 테스트');
    console.log('   잠시 후 API가 업데이트됩니다...\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    const apiRes = await fetch('https://travleap.vercel.app/api/accommodations');
    const apiData = await apiRes.json();

    if (apiData.success && apiData.data) {
      console.log(`   ✅ 배포 사이트 총 ${apiData.data.length}개 숙박 업체`);

      const v1 = apiData.data.find((v: any) => v.business_name === '신안 바다뷰 펜션');
      const v2 = apiData.data.find((v: any) => v.business_name === '증도 힐링 호텔');

      if (v1) console.log(`   ✅ 신안 바다뷰 펜션 확인 (${v1.room_count}개 객실)`);
      else console.log(`   ⚠️  신안 바다뷰 펜션 아직 안 보임 (캐시 때문일 수 있음)`);

      if (v2) console.log(`   ✅ 증도 힐링 호텔 확인 (${v2.room_count}개 객실)`);
      else console.log(`   ⚠️  증도 힐링 호텔 아직 안 보임 (캐시 때문일 수 있음)`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 완료!');
    console.log('');
    console.log('배포 사이트에서 확인:');
    console.log('https://travleap.vercel.app/accommodations');
    console.log('');
    console.log('추가된 업체:');
    console.log('1. 신안 바다뷰 펜션 (CSV 방식) - 3개 객실');
    console.log('2. 증도 힐링 호텔 (PMS 방식) - 3개 객실');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

addLodgingFinal();
