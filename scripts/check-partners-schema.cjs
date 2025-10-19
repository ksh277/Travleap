const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await connection.execute('DESCRIBE partners');
    console.log('\n📋 Partners 테이블 구조:');
    result.rows.forEach(row => {
      const nullable = row.Null === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  - ${row.Field} (${row.Type}) ${nullable}`);
    });
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
})();
