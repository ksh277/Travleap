const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCategoryIds() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });

    console.log('카테고리 ID 수정 중...\n');

    // 1. 숙박 listings를 category_id 1857로 업데이트
    const [accomResult] = await connection.execute(
      'UPDATE listings SET category_id = 1857 WHERE category_id = 1'
    );
    console.log(`✅ 숙박 상품 카테고리 업데이트: ${accomResult.affectedRows}개`);

    // 2. 렌트카 listings를 category_id 1856으로 업데이트
    const [rentcarResult] = await connection.execute(
      'UPDATE listings SET category_id = 1856 WHERE category_id = 2'
    );
    console.log(`✅ 렌트카 상품 카테고리 업데이트: ${rentcarResult.affectedRows}개`);

    // 3. 확인
    const [stay] = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE category_id = 1857');
    const [rentcar] = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE category_id = 1856');

    console.log('\n업데이트 후 확인:');
    console.log(`  - 숙박 (1857/stay): ${stay[0].count}개`);
    console.log(`  - 렌트카 (1856/rentcar): ${rentcar[0].count}개`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

fixCategoryIds();
