const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute('DESCRIBE coupons');
    console.log('=== coupons 테이블 스키마 ===');
    result.rows.forEach(row => {
      console.log(row.Field + ': ' + row.Type);
    });
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkSchema();
