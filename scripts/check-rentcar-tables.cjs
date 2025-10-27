require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  const conn = connect({ url: process.env.DATABASE_URL });

  const result = await conn.execute(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'rentcar%'
    ORDER BY TABLE_NAME
  `);

  console.log('\n렌트카 관련 테이블:');
  console.log('='.repeat(50));
  if (result.rows && result.rows.length > 0) {
    result.rows.forEach(r => {
      console.log('  ✅', r.TABLE_NAME);
    });
  } else {
    console.log('  ❌ rentcar 테이블 없음');
  }
  console.log('');
})();
