const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function checkTables() {
  console.log('🔍 데이터베이스 테이블 목록 조회 중...\n');

  try {
    const result = await connection.execute('SHOW TABLES');

    console.log(`✅ 총 ${result.rows.length}개 테이블 발견:\n`);

    result.rows.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });

    console.log('\n🔍 카테고리 관련 테이블 필터링:\n');

    const categoryKeywords = ['accommodation', 'food', 'restaurant', 'attraction', 'event', 'experience', 'hotel', 'room'];

    result.rows.forEach((row) => {
      const tableName = Object.values(row)[0].toLowerCase();
      if (categoryKeywords.some(keyword => tableName.includes(keyword))) {
        console.log(`  ✓ ${Object.values(row)[0]}`);
      }
    });

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }
}

checkTables().then(() => {
  console.log('\n✅ 완료');
  process.exit(0);
}).catch(() => {
  console.error('\n❌ 실패');
  process.exit(1);
});
