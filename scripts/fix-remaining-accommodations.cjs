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

    console.log('\n남은 숙박 상품 이동 중...');
    console.log('='.repeat(70));

    // 모텔, 방갈로 이동
    const [result] = await connection.execute(`
      UPDATE listings
      SET category_id = 1857
      WHERE category_id = 1856
      AND (title LIKE '%모텔%' OR title LIKE '%방갈로%')
    `);

    console.log(`✅ ${result.affectedRows}개 항목을 숙박 카테고리로 이동`);

    // 확인
    const [rentcarCount] = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE category_id = 1856');
    const [stayCount] = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE category_id = 1857');

    console.log(`\n최종 결과:`);
    console.log(`  - 렌트카 (1856): ${rentcarCount[0].count}개`);
    console.log(`  - 숙박 (1857): ${stayCount[0].count}개`);

    if (rentcarCount[0].count > 0) {
      const [remaining] = await connection.execute(`
        SELECT id, title
        FROM listings
        WHERE category_id = 1856
        LIMIT 5
      `);

      console.log('\n⚠️  렌트카 카테고리에 남은 항목:');
      remaining.forEach(l => {
        console.log(`  - ID ${l.id}: ${l.title}`);
      });
    } else {
      console.log('\n✅ 렌트카 카테고리에 더 이상 숙박 데이터 없음');
    }

    console.log('\n='.repeat(70));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

fix();
