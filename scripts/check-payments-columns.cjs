const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('📋 payments 테이블 컬럼 확인\n');

  // 첫 번째 결제 데이터로 컬럼 확인
  const sample = await db.execute(`
    SELECT *
    FROM payments
    LIMIT 1
  `);

  if (sample.rows && sample.rows.length > 0) {
    console.log('사용 가능한 컬럼:');
    console.log(Object.keys(sample.rows[0]).join(', '));
    console.log('\n샘플 데이터:');
    console.log(sample.rows[0]);
  }

  process.exit(0);
})();
