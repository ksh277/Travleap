/**
 * 투어 관련 모든 테이블 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 투어 관련 테이블 확인 중...\n');

    // 모든 테이블 목록 조회
    const tablesResult = await connection.execute(`SHOW TABLES`);
    const allTables = tablesResult.rows.map(row => Object.values(row)[0]);

    // tour 관련 테이블 필터링
    const tourTables = allTables.filter(t => t.toLowerCase().includes('tour'));

    console.log(`✅ 투어 관련 테이블 (${tourTables.length}개):\n`);
    tourTables.forEach((table, i) => {
      console.log(`[${i + 1}] ${table}`);
    });

    // 필수 테이블 확인
    const requiredTables = ['tour_schedules', 'tour_packages', 'tour_bookings'];

    console.log('\n=== 필수 테이블 존재 여부 ===');
    for (const table of requiredTables) {
      const exists = tourTables.includes(table);
      console.log(`${exists ? '✅' : '❌'} ${table}`);

      if (exists) {
        // 스키마 확인
        const schemaResult = await connection.execute(`DESCRIBE ${table}`);
        console.log(`   컬럼: ${schemaResult.rows.map(r => r.Field).join(', ')}`);
      }
    }

    // listing_tour 테이블 확인
    console.log('\n=== listing_tour 테이블 확인 ===');
    if (tourTables.includes('listing_tour')) {
      const schemaResult = await connection.execute(`DESCRIBE listing_tour`);
      console.log('✅ listing_tour 존재');
      console.log('   컬럼 목록:');
      schemaResult.rows.forEach(col => {
        console.log(`     - ${col.Field} (${col.Type})`);
      });

      // 데이터 확인
      const dataResult = await connection.execute(
        `SELECT COUNT(*) as count FROM listing_tour`
      );
      console.log(`   데이터: ${dataResult.rows[0].count}건`);
    } else {
      console.log('❌ listing_tour 없음');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
