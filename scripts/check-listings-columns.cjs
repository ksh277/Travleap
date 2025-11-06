/**
 * listings 테이블 컬럼 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function checkListingsColumns() {
  console.log('🔍 listings 테이블 구조 확인 중...\n');

  try {
    // 팝업 상품 하나 조회 (모든 컬럼 확인)
    const result = await connection.execute(`
      SELECT *
      FROM listings
      WHERE category = '팝업'
      LIMIT 1
    `);

    if (result.rows && result.rows.length > 0) {
      const listing = result.rows[0];
      console.log('✅ listings 테이블 컬럼 목록:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const columns = Object.keys(listing);
      columns.forEach((col, index) => {
        const value = listing[col];
        const type = typeof value;
        const preview = value ? String(value).substring(0, 50) : 'null';
        console.log(`${index + 1}. ${col}`);
        console.log(`   타입: ${type}`);
        console.log(`   값 미리보기: ${preview}\n`);
      });
    } else {
      console.log('❌ 데이터 없음');
    }

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

checkListingsColumns()
  .then(() => {
    console.log('\n✅ 확인 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 실패:', error);
    process.exit(1);
  });
