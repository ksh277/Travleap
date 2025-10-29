const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute('DESCRIBE coupons');
    console.log('📋 coupons 테이블 구조:\n');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('❌ 스키마 조회 실패:', error);
  }
}

checkSchema();
