const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 insurance 테이블 확인 중...\n');
    
    try {
      const result = await connection.execute('DESCRIBE insurances');
      console.log('✅ insurances 테이블이 존재합니다!');
      console.log('\n📋 컬럼 목록:');
      result.rows.forEach(row => {
        console.log(`  - ${row.Field} (${row.Type})`);
      });
      
      // 데이터 개수 확인
      const countResult = await connection.execute('SELECT COUNT(*) as count FROM insurances');
      const count = countResult.rows[0].count;
      console.log(`\n📊 현재 보험 데이터: ${count}개`);
      
    } catch (error) {
      console.log('❌ insurances 테이블이 없습니다!');
      console.log('   테이블을 생성해야 합니다.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 에러:', error.message);
    process.exit(1);
  }
})();
