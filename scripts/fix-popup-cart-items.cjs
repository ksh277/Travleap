require('dotenv').config();
const { connect } = require('@planetscale/database');

async function fixPopupCartItems() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 [수정] 팝업 상품 장바구니 항목의 num_adults, adult_price 제거 중...\n');

    // 1. 팝업 상품 cart_items 조회
    const cartResult = await connection.execute(`
      SELECT c.id, c.listing_id, c.num_adults, c.adult_price, l.title, l.category
      FROM cart_items c
      INNER JOIN listings l ON c.listing_id = l.id
      WHERE l.category_id = 1860 OR l.category = '팝업'
    `);

    if (cartResult.rows && cartResult.rows.length > 0) {
      console.log(`📋 수정 대상: ${cartResult.rows.length}개 항목\n`);

      for (const row of cartResult.rows) {
        console.log(`- cart_item_id: ${row.id}, 상품: ${row.title}`);
        console.log(`  기존 num_adults: ${row.num_adults}, adult_price: ${row.adult_price}`);

        // 2. num_adults, adult_price를 NULL로 수정
        await connection.execute(`
          UPDATE cart_items
          SET num_adults = NULL,
              num_children = NULL,
              num_infants = NULL,
              num_seniors = NULL,
              adult_price = NULL,
              child_price = NULL,
              infant_price = NULL,
              updated_at = NOW()
          WHERE id = ?
        `, [row.id]);

        console.log(`  ✅ 수정 완료: num_adults/adult_price → NULL\n`);
      }

      console.log(`\n✅ 총 ${cartResult.rows.length}개 항목 수정 완료!`);
      console.log(`\n장바구니 페이지를 새로고침하면 정상 가격이 표시됩니다.`);

    } else {
      console.log('ℹ️  수정할 팝업 상품 장바구니 항목 없음');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

fixPopupCartItems();
