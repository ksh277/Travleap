const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function checkProducts() {
  console.log('🔍 생성했다고 한 상품들 (ID 354-358) 확인 중...\n');

  const result = await connection.execute(`
    SELECT id, title, category, price_from, is_active, cart_enabled, created_at
    FROM listings
    WHERE id BETWEEN 354 AND 358
    ORDER BY id
  `);

  if (!result.rows || result.rows.length === 0) {
    console.log('❌ ID 354-358 범위에 상품이 없습니다!\n');
  } else {
    console.log(`✅ ${result.rows.length}개 상품 발견:\n`);
    result.rows.forEach(p => {
      console.log(`  ID: ${p.id}`);
      console.log(`  제목: ${p.title}`);
      console.log(`  카테고리: ${p.category}`);
      console.log(`  가격: ${p.price_from?.toLocaleString()}원`);
      console.log(`  활성화: ${p.is_active ? '✅' : '❌'}`);
      console.log(`  장바구니: ${p.cart_enabled ? '✅' : '❌'}`);
      console.log(`  생성일: ${p.created_at}`);
      console.log();
    });
  }

  console.log('🔍 최근 생성된 모든 상품 확인 중 (최근 24시간)...\n');

  const recentResult = await connection.execute(`
    SELECT id, title, category, price_from, is_active, cart_enabled, created_at
    FROM listings
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ORDER BY created_at DESC
  `);

  if (!recentResult.rows || recentResult.rows.length === 0) {
    console.log('❌ 최근 24시간 내 생성된 상품이 없습니다!\n');
  } else {
    console.log(`✅ 최근 ${recentResult.rows.length}개 상품:\n`);
    recentResult.rows.forEach(p => {
      console.log(`  ID: ${p.id} | ${p.category} | ${p.title}`);
    });
  }

  console.log('\n🔍 카테고리별 상품 개수 확인...\n');

  const categoryCount = await connection.execute(`
    SELECT category, COUNT(*) as count
    FROM listings
    WHERE is_active = 1
    GROUP BY category
    ORDER BY category
  `);

  if (categoryCount.rows && categoryCount.rows.length > 0) {
    console.log('카테고리별 활성화된 상품 개수:');
    categoryCount.rows.forEach(c => {
      console.log(`  ${c.category || '(NULL)'}: ${c.count}개`);
    });
  }
}

checkProducts().then(() => {
  console.log('\n✅ 조회 완료');
  process.exit(0);
}).catch(err => {
  console.error('❌ 에러:', err);
  process.exit(1);
});
