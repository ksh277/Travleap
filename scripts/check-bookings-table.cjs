require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkBookingsTable() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n=== bookings 테이블 구조 확인 ===\n');

    const bookingsSchema = await connection.execute('DESCRIBE bookings');
    console.log('bookings 테이블 필드:');
    bookingsSchema.rows.forEach(row => {
      console.log(`  ${row.Field.padEnd(30)} ${row.Type.padEnd(20)} ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // 샘플 데이터 확인
    console.log('\n=== bookings 테이블 샘플 데이터 ===\n');
    const sample = await connection.execute('SELECT * FROM bookings LIMIT 1');

    if (sample.rows && sample.rows.length > 0) {
      console.log('샘플 레코드:');
      Object.entries(sample.rows[0]).forEach(([key, value]) => {
        console.log(`  ${key.padEnd(30)} = ${value}`);
      });
    } else {
      console.log('데이터가 없습니다.');
    }

  } catch (error) {
    console.error('\nError:', error.message);
  }
}

checkBookingsTable();
