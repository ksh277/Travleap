/**
 * 모든 테이블 목록 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 데이터베이스의 모든 테이블 확인 중...\n');

    const result = await connection.execute(`SHOW TABLES`);

    if (result.rows && result.rows.length > 0) {
      console.log(`✅ 총 ${result.rows.length}개의 테이블 발견:\n`);

      const tableNames = result.rows.map(row => Object.values(row)[0]);
      tableNames.sort();

      tableNames.forEach((tableName, index) => {
        const icon = tableName.includes('tour') ? '✈️' :
                     tableName.includes('event') ? '📅' :
                     tableName.includes('rentcar') ? '🚗' :
                     tableName.includes('booking') ? '📋' :
                     tableName.includes('payment') ? '💳' : '📄';

        console.log(`${icon} [${index + 1}] ${tableName}`);
      });

      // 투어와 이벤트 관련 테이블 확인
      console.log('\n=== 투어 관련 테이블 ===');
      const tourTables = tableNames.filter(t => t.includes('tour'));
      if (tourTables.length > 0) {
        tourTables.forEach(t => console.log(`  ✅ ${t}`));
      } else {
        console.log('  ❌ 투어 관련 테이블 없음');
      }

      console.log('\n=== 이벤트 관련 테이블 ===');
      const eventTables = tableNames.filter(t => t.includes('event'));
      if (eventTables.length > 0) {
        eventTables.forEach(t => console.log(`  ✅ ${t}`));
      } else {
        console.log('  ❌ 이벤트 관련 테이블 없음');
      }

    } else {
      console.log('ℹ️ 테이블 없음');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
