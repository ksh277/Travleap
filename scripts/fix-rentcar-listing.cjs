const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔧 Fixing rentcar listing...\n');

    // 렌트카 상품 확인
    const checkResult = await connection.execute(`
      SELECT id, title, category, category_id, price_from, is_published, is_active
      FROM listings
      WHERE category_id = 1856
    `);

    console.log('📋 현재 렌트카 상품:');
    checkResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.title}`);
      console.log(`    category: "${row.category}" (should be "rentcar")`);
      console.log(`    price: ${row.price_from} (should not be null)`);
      console.log(`    published: ${row.is_published}, active: ${row.is_active}`);
    });

    console.log('\n🔄 Updating...');

    // 렌트카 상품 업데이트
    const updateResult = await connection.execute(`
      UPDATE listings
      SET
        category = 'rentcar',
        price_from = 50000,
        is_published = 1,
        is_active = 1
      WHERE category_id = 1856
    `);

    console.log(`✅ ${updateResult.rowsAffected} row(s) updated\n`);

    // 업데이트 후 확인
    const afterResult = await connection.execute(`
      SELECT id, title, category, price_from, is_published, is_active
      FROM listings
      WHERE category_id = 1856
    `);

    console.log('✅ 업데이트 후:');
    afterResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.title}`);
      console.log(`    category: "${row.category}"`);
      console.log(`    price: ${row.price_from}`);
      console.log(`    published: ${row.is_published}, active: ${row.is_active}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
