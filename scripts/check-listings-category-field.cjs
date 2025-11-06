const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 Checking listings table structure...\n');

    // listings 테이블 구조 확인
    const schemaResult = await connection.execute('DESCRIBE listings');

    console.log('📋 listings 테이블 컬럼:');
    schemaResult.rows.forEach(row => {
      if (row.Field.includes('category') || row.Field.includes('type')) {
        console.log(`  ⭐ ${row.Field} (${row.Type}) ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    });

    console.log('\n📊 category 관련 데이터 샘플:');
    const sampleResult = await connection.execute(`
      SELECT id, title, category, category_id, is_published, is_active, price_from
      FROM listings
      LIMIT 10
    `);

    sampleResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.title}`);
      console.log(`    category: "${row.category}", category_id: ${row.category_id}, price: ${row.price_from}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
