const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkListingsSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== listings 테이블 스키마 ===\n');

  try {
    const schema = await connection.execute('DESCRIBE listings');
    console.log('컬럼 목록:');
    schema.rows.forEach(row => {
      console.log(`  - ${row.Field} (${row.Type})`);
    });

    console.log('\n샘플 데이터 (최근 3개):');
    const sample = await connection.execute('SELECT * FROM listings LIMIT 3');
    if (sample.rows && sample.rows.length > 0) {
      sample.rows.forEach((listing, idx) => {
        console.log(`\n${idx + 1}. ID: ${listing.id}`);
        Object.keys(listing).slice(0, 10).forEach(key => {
          console.log(`   ${key}: ${listing[key]}`);
        });
      });
    }
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkListingsSchema().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
