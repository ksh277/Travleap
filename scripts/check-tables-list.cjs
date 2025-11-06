const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 Checking all tables in database...\n');

    const result = await connection.execute('SHOW TABLES');

    console.log('📋 Tables found:');
    result.rows.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });

    console.log(`\n총 ${result.rows.length}개의 테이블이 존재합니다.\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
