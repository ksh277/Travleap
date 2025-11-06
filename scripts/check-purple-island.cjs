const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkProduct() {
  const connection = connect({ url: process.env.DATABASE_URL });
  
  // 퍼플아일랜드 상품 조회
  const result = await connection.execute(`
    SELECT id, title, category, category_id, is_active
    FROM listings
    WHERE title LIKE '%퍼플아일랜드%'
    LIMIT 5
  `);
  
  console.log('🔍 퍼플아일랜드 상품:', result.rows);
  
  // categories 테이블 확인
  const categories = await connection.execute(`
    SELECT id, name, name_ko
    FROM categories
    LIMIT 20
  `);
  
  console.log('\n📂 카테고리 목록:', categories.rows);
}

checkProduct().catch(console.error);
