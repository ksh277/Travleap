const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🛒 최근 장바구니 항목 확인:\n');

    const result = await connection.execute(`
      SELECT
        c.id, c.user_id, c.listing_id, c.quantity, c.created_at,
        l.id as listing_exists, l.title, l.is_active, l.category, l.category_id
      FROM cart_items c
      LEFT JOIN listings l ON c.listing_id = l.id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    if (result.rows && result.rows.length > 0) {
      result.rows.forEach(item => {
        console.log(`Cart ID ${item.id}:`);
        console.log(`  User: ${item.user_id}`);
        console.log(`  Listing: ${item.listing_id} - ${item.title || 'NULL'}`);
        console.log(`  Listing exists: ${item.listing_exists ? 'YES' : 'NO'}`);
        console.log(`  Active: ${item.is_active}`);
        console.log(`  Category: ${item.category || 'NULL'} (ID: ${item.category_id})`);
        console.log(`  Created: ${item.created_at}`);
        console.log('');
      });
    } else {
      console.log('장바구니에 항목이 없습니다.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
})();
