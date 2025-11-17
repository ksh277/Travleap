require('dotenv').config();
const { connect } = require('@planetscale/database');

async function verifyAllPopupCart() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔍 [전체 검증] 모든 팝업 상품 장바구니 항목 확인...\n');

    const result = await connection.execute(`
      SELECT c.id, c.user_id, c.listing_id, c.quantity, c.price_snapshot,
             c.num_adults, c.adult_price, l.title, l.price_from, l.category
      FROM cart_items c
      INNER JOIN listings l ON c.listing_id = l.id
      WHERE l.category_id = 1860 OR l.category = '팝업'
      ORDER BY c.id
    `);

    if (result.rows && result.rows.length > 0) {
      console.log(`📋 팝업 상품 장바구니 항목: ${result.rows.length}개\n`);

      let hasIssue = false;
      result.rows.forEach((row, i) => {
        const status = (row.num_adults !== null || row.adult_price !== null) ? '❌ 문제' : '✅ 정상';
        console.log(`${i + 1}. [${status}] cart_item_id: ${row.id}`);
        console.log(`   - 상품: ${row.title}`);
        console.log(`   - listings.price_from: ${row.price_from}`);
        console.log(`   - cart_items.price_snapshot: ${row.price_snapshot}`);
        console.log(`   - num_adults: ${row.num_adults}, adult_price: ${row.adult_price}`);
        console.log(`   - quantity: ${row.quantity}\n`);

        if (row.num_adults !== null || row.adult_price !== null) {
          hasIssue = true;
        }
      });

      if (!hasIssue) {
        console.log('✅ 모든 팝업 상품 장바구니 항목이 올바르게 설정되어 있습니다!');
      } else {
        console.log('⚠️  일부 항목에 문제가 있습니다. fix-popup-cart-items.cjs를 다시 실행하세요.');
      }
    } else {
      console.log('ℹ️  장바구니에 팝업 상품 없음');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

verifyAllPopupCart();
