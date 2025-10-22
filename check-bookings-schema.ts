import 'dotenv/config';
import { connect } from '@planetscale/database';

const db = connect({ url: process.env.DATABASE_URL! });

async function checkSchema() {
  console.log('📋 rentcar_bookings 테이블 구조 확인\n');

  const result = await db.execute('SHOW COLUMNS FROM rentcar_bookings');

  console.log('컬럼 목록:');
  result.rows.forEach((row: any) => {
    console.log(`  - ${row.Field} (${row.Type}) ${row.Null === 'YES' ? 'NULL 가능' : 'NOT NULL'}`);
  });

  console.log('\n샘플 데이터:');
  const sample = await db.execute('SELECT * FROM rentcar_bookings LIMIT 1');
  if (sample.rows.length > 0) {
    console.log(JSON.stringify(sample.rows[0], null, 2));
  } else {
    console.log('  (예약 데이터 없음)');
  }
}

checkSchema();
