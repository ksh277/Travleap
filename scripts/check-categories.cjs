const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCategories() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });

    const [categories] = await connection.execute('SELECT * FROM categories ORDER BY id');

    console.log('\n카테고리 목록:');
    console.log('='.repeat(70));
    categories.forEach(c => {
      console.log(`ID: ${c.id} | Slug: ${c.slug || 'N/A'} | Name: ${c.name_ko || c.name || 'N/A'}`);
    });
    console.log('='.repeat(70));

    // 숙박 상품 수 확인
    const [accom1] = await connection.execute("SELECT COUNT(*) as count FROM listings WHERE category_id = 1");
    console.log(`\n숙박 상품 (category_id=1): ${accom1[0].count}개`);

    const [rentcar] = await connection.execute("SELECT COUNT(*) as count FROM listings WHERE category_id = 2");
    console.log(`렌트카 상품 (category_id=2): ${rentcar[0].count}개`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkCategories();
