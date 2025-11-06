const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkCart() {
  const connection = connect({ url: process.env.DATABASE_URL });
  
  // userId 11의 장바구니 확인 (로그에서 본 userId)
  const result = await connection.execute(`
    SELECT
      c.*,
      l.title,
      l.category,
      l.price_from
    FROM cart_items c
    LEFT JOIN listings l ON c.listing_id = l.id
    WHERE c.user_id = 11
  `);
  
  console.log('🛒 User 11의 장바구니:', result.rows);
}

checkCart().catch(console.error);
