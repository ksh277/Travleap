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
    
    // Check all listings
    const [allListings] = await connection.execute('SELECT COUNT(*) as count FROM listings');
    console.log(`전체 상품: ${allListings[0].count}개`);
    
    // Check by category
    const [byCategory] = await connection.execute(`
      SELECT category_id, COUNT(*) as count 
      FROM listings 
      GROUP BY category_id
    `);
    console.log('\n카테고리별 상품:');
    byCategory.forEach(c => {
      console.log(`  - Category ${c.category_id}: ${c.count}개`);
    });
    
    // Check partners
    const [partnerList] = await connection.execute(`
      SELECT id, business_name, contact_name 
      FROM partners 
      ORDER BY id
    `);
    console.log('\n파트너 목록:');
    partnerList.forEach(p => {
      console.log(`  - ID ${p.id}: ${p.business_name} (${p.contact_name})`);
    });
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    if (connection) await connection.end();
  }
}

check();
