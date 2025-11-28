const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute('DESCRIBE partners');
    console.log('=== partners 테이블 스키마 ===');
    result.rows.forEach(row => {
      console.log(row.Field + ': ' + row.Type);
    });
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkSchema();
