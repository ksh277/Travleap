const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkBookingsSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== bookings 테이블 실제 스키마 ===\n');

  try {
    const schema = await connection.execute('DESCRIBE bookings');

    console.log('컬럼 목록:');
    schema.rows.forEach(row => {
      const nullInfo = row.Null === 'YES' ? 'NULL' : 'NOT NULL';
      const keyInfo = row.Key ? '[' + row.Key + ']' : '';
      console.log(`  - ${row.Field} (${row.Type}) ${nullInfo} ${keyInfo}`);
    });

    console.log('\n렌트카 예약 샘플 조회 (실제 컬럼 사용):');
    const sample = await connection.execute(`
      SELECT *
      FROM bookings
      WHERE category = 'rentcar'
      LIMIT 1
    `);

    if (sample.rows && sample.rows.length > 0) {
      console.log('\n샘플 예약 데이터:');
      const booking = sample.rows[0];
      Object.keys(booking).forEach(key => {
        const value = booking[key];
        if (value && typeof value === 'string' && value.length > 100) {
          console.log(`  ${key}: ${value.substring(0, 100)}...`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
    } else {
      console.log('  렌트카 예약 데이터 없음');
    }

  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkBookingsSchema().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
