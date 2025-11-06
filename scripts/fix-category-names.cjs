const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function fixCategoryNames() {
  console.log('🔧 상품 카테고리 이름 수정 중...\n');

  try {
    // 먼저 현재 상태 확인
    console.log('📊 현재 상태:');
    const currentResult = await connection.execute(`
      SELECT id, title, category
      FROM listings
      WHERE id BETWEEN 354 AND 358
      ORDER BY id
    `);

    currentResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.title} - category="${row.category}"`);
    });

    console.log('\n🔧 카테고리 이름 변경 중...\n');

    // 1. 숙박: '숙박' → 'stay'
    await connection.execute(`
      UPDATE listings
      SET category = 'stay'
      WHERE id = 354
    `);
    console.log('  ✅ ID 354: "숙박" → "stay"');

    // 2. 음식점: '음식점' → 'food'
    await connection.execute(`
      UPDATE listings
      SET category = 'food'
      WHERE id = 355
    `);
    console.log('  ✅ ID 355: "음식점" → "food"');

    // 3. 관광지: '관광지' → 'tour' (또는 'attraction')
    await connection.execute(`
      UPDATE listings
      SET category = 'tour'
      WHERE id = 356
    `);
    console.log('  ✅ ID 356: "관광지" → "tour"');

    // 4. 이벤트: '이벤트' → 'event'
    await connection.execute(`
      UPDATE listings
      SET category = 'event'
      WHERE id = 357
    `);
    console.log('  ✅ ID 357: "이벤트" → "event"');

    // 5. 체험: '체험' → 'experience'
    await connection.execute(`
      UPDATE listings
      SET category = 'experience'
      WHERE id = 358
    `);
    console.log('  ✅ ID 358: "체험" → "experience"');

    // 변경 후 확인
    console.log('\n📊 변경 후:');
    const afterResult = await connection.execute(`
      SELECT id, title, category
      FROM listings
      WHERE id BETWEEN 354 AND 358
      ORDER BY id
    `);

    afterResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.title} - category="${row.category}"`);
    });

    console.log('\n✅ 카테고리 이름 변경 완료!');

  } catch (error) {
    console.error('❌ 에러:', error.message);
    throw error;
  }
}

fixCategoryNames().then(() => {
  console.log('\n✅ 완료');
  process.exit(0);
}).catch(() => {
  console.error('\n❌ 실패');
  process.exit(1);
});
