const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });

    console.log('\n카테고리 매핑 수정 중...');
    console.log('='.repeat(70));

    // 1. 숙박 관련 키워드가 있는 listings를 숙박 카테고리(1857)로 이동
    const accommodationKeywords = ['호텔', '게스트하우스', '펜션', '민박', '리조트', '숙박', '객실', '룸'];

    for (const keyword of accommodationKeywords) {
      const [result] = await connection.execute(`
        UPDATE listings
        SET category_id = 1857
        WHERE category_id = 1856
        AND title LIKE ?
      `, [`%${keyword}%`]);

      if (result.affectedRows > 0) {
        console.log(`✅ "${keyword}" 포함 항목 ${result.affectedRows}개를 숙박 카테고리로 이동`);
      }
    }

    // 2. 확인
    console.log('\n수정 후 확인:');
    const [rentcarCount] = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE category_id = 1856');
    const [stayCount] = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE category_id = 1857');

    console.log(`  - 렌트카 (1856): ${rentcarCount[0].count}개`);
    console.log(`  - 숙박 (1857): ${stayCount[0].count}개`);

    // 3. 렌트카 카테고리에 남은 상품 확인
    const [remainingRentcar] = await connection.execute(`
      SELECT id, title
      FROM listings
      WHERE category_id = 1856
      LIMIT 10
    `);

    console.log('\n렌트카 카테고리에 남은 상품:');
    remainingRentcar.forEach(l => {
      console.log(`  - ${l.title}`);
    });

    console.log('\n='.repeat(70));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

fix();
