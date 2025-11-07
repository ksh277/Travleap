/**
 * 모든 예약 관련 테이블 구조 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkTables() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 예약 관련 테이블 조회 중...\n');

  const result = await conn.execute('SHOW TABLES');

  const allTables = result.rows.map(r => Object.values(r)[0]);

  const bookingTables = allTables.filter(name =>
    name.includes('booking') ||
    name.includes('rentcar') ||
    name.includes('accommodation') ||
    name.includes('food') ||
    name.includes('tour') ||
    name.includes('experience') ||
    name.includes('event') ||
    name.includes('attraction')
  );

  console.log('📋 예약/결제 관련 테이블 (' + bookingTables.length + '개):');
  bookingTables.forEach(table => console.log('  -', table));

  console.log('\n📊 각 테이블의 구조 확인 중...\n');

  for (const table of bookingTables) {
    try {
      const desc = await conn.execute('DESCRIBE ' + table);
      console.log('\n🔸 ' + table + ':');

      const importantCols = desc.rows.filter(r =>
        r.Field.includes('id') ||
        r.Field.includes('user') ||
        r.Field.includes('booking') ||
        r.Field.includes('payment') ||
        r.Field.includes('status') ||
        r.Field.includes('total') ||
        r.Field.includes('amount') ||
        r.Field.includes('number')
      );

      if (importantCols.length > 0) {
        importantCols.forEach(row => {
          console.log('  - ' + row.Field + ': ' + row.Type);
        });
      } else {
        console.log('  (주요 컬럼 없음)');
      }
    } catch (e) {
      console.log('  ❌ 조회 실패: ' + e.message);
    }
  }

  console.log('\n\n🔍 listings 테이블 카테고리 확인...\n');
  try {
    const categories = await conn.execute('SELECT DISTINCT category FROM listings WHERE category IS NOT NULL');
    console.log('📂 listings 카테고리:');
    categories.rows.forEach(row => {
      console.log('  - ' + row.category);
    });
  } catch (e) {
    console.log('❌ listings 조회 실패: ' + e.message);
  }
}

checkTables().catch(console.error);
