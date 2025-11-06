const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function checkPopupProducts() {
  console.log('🔍 팝업 상품 확인 중...\n');

  try {
    const result = await connection.execute(`
      SELECT id, title, category, price_from, is_active, cart_enabled
      FROM listings
      WHERE category = '팝업' OR category = 'popup'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log('❌ 팝업 상품이 없습니다!\n');
      console.log('다른 카테고리 확인:');

      const allCategories = await connection.execute(`
        SELECT DISTINCT category, COUNT(*) as count
        FROM listings
        WHERE is_active = 1
        GROUP BY category
        ORDER BY count DESC
      `);

      allCategories.rows.forEach(row => {
        console.log(`  - ${row.category}: ${row.count}개`);
      });
    } else {
      console.log(`✅ ${result.rows.length}개 팝업 상품 발견:\n`);
      result.rows.forEach(p => {
        console.log(`  ID: ${p.id} | ${p.title} | ${p.price_from}원`);
        console.log(`    category="${p.category}", active=${p.is_active}, cart=${p.cart_enabled}`);
      });
    }

    // popups 테이블도 확인
    console.log('\n🔍 popups 테이블 확인:');
    const popupsResult = await connection.execute(`
      SELECT id, brand_name, popup_name, status, is_active
      FROM popups
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (popupsResult.rows && popupsResult.rows.length > 0) {
      console.log(`✅ ${popupsResult.rows.length}개 팝업 (popups 테이블):`);
      popupsResult.rows.forEach(p => {
        console.log(`  ID: ${p.id} | ${p.brand_name} - ${p.popup_name} | status=${p.status}`);
      });
    } else {
      console.log('⚠️  popups 테이블에 데이터 없음');
    }

  } catch (error) {
    console.error('❌ 에러:', error.message);
    throw error;
  }
}

checkPopupProducts().then(() => {
  console.log('\n✅ 완료');
  process.exit(0);
}).catch(() => {
  console.error('\n❌ 실패');
  process.exit(1);
});
