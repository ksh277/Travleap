const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });

    console.log('\n렌트카 카테고리 데이터 확인:');
    console.log('='.repeat(70));

    // 렌트카 카테고리 ID 확인
    const [rentcarCat] = await connection.execute("SELECT * FROM categories WHERE slug = 'rentcar'");
    console.log(`\n렌트카 카테고리: ID ${rentcarCat[0]?.id}, slug: ${rentcarCat[0]?.slug}`);

    // 렌트카 카테고리의 listings 확인
    const [rentcarListings] = await connection.execute(`
      SELECT id, title, category_id, partner_id, price_from
      FROM listings
      WHERE category_id = ?
      LIMIT 10
    `, [rentcarCat[0].id]);

    console.log(`\n렌트카 카테고리 (ID ${rentcarCat[0].id})의 listings:`);
    rentcarListings.forEach(l => {
      console.log(`  - ID ${l.id}: ${l.title} (가격: ₩${l.price_from})`);
    });

    // 숙박 카테고리 확인
    const [stayCat] = await connection.execute("SELECT * FROM categories WHERE slug = 'stay'");
    console.log(`\n\n숙박 카테고리: ID ${stayCat[0]?.id}, slug: ${stayCat[0]?.slug}`);

    const [stayListings] = await connection.execute(`
      SELECT id, title, category_id, partner_id, price_from
      FROM listings
      WHERE category_id = ?
      LIMIT 10
    `, [stayCat[0].id]);

    console.log(`\n숙박 카테고리 (ID ${stayCat[0].id})의 listings:`);
    stayListings.forEach(l => {
      console.log(`  - ID ${l.id}: ${l.title} (가격: ₩${l.price_from})`);
    });

    console.log('\n='.repeat(70));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

check();
