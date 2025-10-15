/**
 * PlanetScale DB에서 listings 조회
 */
import dotenv from 'dotenv';
dotenv.config();

import { db } from './utils/database.js';

async function queryListings() {
  console.log('\n🔍 PlanetScale DB - listings 테이블 조회');
  console.log('='.repeat(50));

  try {
    // 전체 listings 수 확인
    const countResult = await db.query('SELECT COUNT(*) as total FROM listings');
    const totalCount = countResult[0]?.total || 0;
    console.log(`\n총 listings: ${totalCount}개`);

    if (totalCount === 0) {
      console.log('⚠️  listings 테이블이 비어있습니다.');
      console.log('\n💡 테스트를 위해 listing을 추가하시겠습니까?');
      return [];
    }

    // 상위 5개 조회
    const listings = await db.query(`
      SELECT id, title, category, max_capacity, available_spots, price_per_person
      FROM listings
      LIMIT 5
    `);

    console.log(`\n상위 ${listings.length}개:`);
    console.log('-'.repeat(50));
    listings.forEach((listing: any) => {
      console.log(`ID: ${listing.id}`);
      console.log(`  제목: ${listing.title || '(제목 없음)'}`);
      console.log(`  카테고리: ${listing.category || 'N/A'}`);
      console.log(`  최대인원: ${listing.max_capacity || 'N/A'}`);
      console.log(`  예약가능: ${listing.available_spots || 'N/A'}`);
      console.log(`  가격: ${listing.price_per_person || 'N/A'}원`);
      console.log('-'.repeat(50));
    });

    return listings;

  } catch (error: any) {
    console.error('\n❌ 조회 실패:', error.message);

    // 테이블이 없는 경우
    if (error.message.includes("doesn't exist")) {
      console.log('\n⚠️  listings 테이블이 존재하지 않습니다.');
      console.log('💡 데이터베이스 스키마를 확인해주세요.');
    }

    return [];
  }
}

async function insertTestListing() {
  console.log('\n📝 테스트 listing 추가');
  console.log('='.repeat(50));

  try {
    const result = await db.execute(`
      INSERT INTO listings (
        title,
        category,
        max_capacity,
        available_spots,
        price_per_person,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      '제주 렌트카 - 현대 소나타 (테스트)',
      'rentcar',
      4,
      10,
      50000
    ]);

    console.log(`✅ 테스트 listing 추가 완료 (ID: ${result.insertId})`);
    return result.insertId;

  } catch (error: any) {
    console.error('❌ 추가 실패:', error.message);
    return null;
  }
}

async function main() {
  console.log('\n🚀 PlanetScale DB 데이터 확인');
  console.log('Database:', process.env.DATABASE_HOST || 'Not configured');

  // 기존 listings 조회
  const listings = await queryListings();

  // listings가 없으면 테스트 데이터 추가 제안
  if (listings.length === 0) {
    console.log('\n⚠️  테스트를 위해 listing을 추가해야 합니다.');
    console.log('\n테스트 listing 추가 중...');
    const newId = await insertTestListing();

    if (newId) {
      console.log(`\n✅ ID ${newId}로 테스트 가능합니다.`);
      console.log(`\n다음 명령으로 테스트하세요:`);
      console.log(`node test-concurrent-bookings.js`);
    }
  } else {
    console.log(`\n✅ 테스트 가능한 listings: ${listings.map((l: any) => l.id).join(', ')}`);
    console.log(`\n다음 명령으로 테스트하세요:`);
    console.log(`node test-concurrent-bookings.js`);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('실행 오류:', error);
  process.exit(1);
});
