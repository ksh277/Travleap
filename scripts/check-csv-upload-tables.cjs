/**
 * CSV 업로드 API가 사용하는 테이블 존재 여부 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 CSV 업로드 API 테이블 확인\n');
    console.log('='.repeat(60));

    // 확인할 테이블 목록
    const tablesToCheck = [
      'accommodation_rooms',
      'accommodation_vendors',
      'partners',
      'listings'
    ];

    for (const tableName of tablesToCheck) {
      console.log(`\n🔍 ${tableName} 테이블 확인...`);

      try {
        const result = await connection.execute(
          `SELECT COUNT(*) as count FROM ${tableName} LIMIT 1`
        );
        console.log(`   ✅ 존재함 (레코드 수: ${result.rows[0].count})`);
      } catch (error) {
        if (error.message.includes("doesn't exist")) {
          console.log(`   ❌ 존재하지 않음`);
        } else {
          console.log(`   ⚠️  오류: ${error.message}`);
        }
      }
    }

    // listings 테이블 구조 확인
    console.log('\n\n📋 listings 테이블 구조:');
    console.log('='.repeat(60));

    try {
      const result = await connection.execute(`DESCRIBE listings`);

      if (result.rows && result.rows.length > 0) {
        result.rows.forEach(field => {
          console.log(`  ${field.Field.padEnd(30)} ${field.Type.padEnd(20)} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      }
    } catch (error) {
      console.error('  ❌ 조회 실패:', error.message);
    }

    // partners 테이블 구조 확인
    console.log('\n\n📋 partners 테이블 구조:');
    console.log('='.repeat(60));

    try {
      const result = await connection.execute(`DESCRIBE partners`);

      if (result.rows && result.rows.length > 0) {
        result.rows.forEach(field => {
          console.log(`  ${field.Field.padEnd(30)} ${field.Type.padEnd(20)} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      }
    } catch (error) {
      console.error('  ❌ 조회 실패:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
