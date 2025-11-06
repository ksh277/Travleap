const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function checkTableStructure() {
  console.log('🔍 listing_* 테이블 구조 확인 중...\n');

  const tables = ['listings', 'listing_accommodation', 'listing_food', 'listing_event'];

  for (const table of tables) {
    try {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📋 ${table} 테이블:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const result = await connection.execute(`DESCRIBE ${table}`);

      result.rows.forEach((row) => {
        const nullable = row.Null === 'YES' ? '(nullable)' : '(required)';
        const defaultVal = row.Default ? `[default: ${row.Default}]` : '';
        console.log(`  ${row.Field}`);
        console.log(`    Type: ${row.Type} ${nullable} ${defaultVal}`);
      });

      // 데이터 샘플 조회
      const sampleResult = await connection.execute(`SELECT * FROM ${table} LIMIT 1`);

      if (sampleResult.rows && sampleResult.rows.length > 0) {
        console.log(`\n  📊 샘플 데이터 있음 (총 레코드: ${sampleResult.rows.length}개)`);
      } else {
        console.log(`\n  ⚠️  데이터 없음`);
      }

      console.log();

    } catch (error) {
      console.error(`  ❌ ${table} 조회 실패:`, error.message);
      console.log();
    }
  }
}

checkTableStructure().then(() => {
  console.log('✅ 완료');
  process.exit(0);
}).catch((err) => {
  console.error('❌ 실패:', err);
  process.exit(1);
});
