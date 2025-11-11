const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute('DESCRIBE rentcar_bookings');
    console.log('\nrentcar_bookings 테이블 스키마:');
    console.table(result.rows.map(row => ({
      'Field': row.Field,
      'Type': row.Type,
      'Null': row.Null,
      'Key': row.Key,
      'Default': row.Default
    })));
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkSchema();
