const { connect } = require('@planetscale/database');
require('dotenv').config();

async function getExactColumns() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== 렌트카 테이블 정확한 컬럼명 ===\n');

  try {
    console.log('rentcar_vehicles 컬럼:');
    const vSchema = await conn.execute('DESCRIBE rentcar_vehicles');
    vSchema.rows.forEach(r => console.log(`  - ${r.Field}`));

    console.log('\nrentcar_bookings 컬럼:');
    const bSchema = await conn.execute('DESCRIBE rentcar_bookings');
    bSchema.rows.forEach(r => console.log(`  - ${r.Field}`));

  } catch (error) {
    console.error('오류:', error.message);
  }
}

getExactColumns().then(() => process.exit(0));
