require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkPopupProductPrice() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔍 [가격 확인] 퍼플아일랜드 냉장고 아크릴 마그네틱 자석 상품 조회...\n');

    // 1. listings 테이블에서 상품 조회
    const listingResult = await connection.execute(`
      SELECT id, title, price_from, category_id, category, is_active
      FROM listings
      WHERE title LIKE '%퍼플아일랜드%냉장고%'
         OR title LIKE '%자석%'
         OR title LIKE '%마그네틱%'
      LIMIT 5
    `);

    if (listingResult.rows && listingResult.rows.length > 0) {
      console.log('📋 [listings 테이블] 상품 정보:');
      listingResult.rows.forEach((row, i) => {
        console.log(`\n${i + 1}. ${row.title}`);
        console.log(`   - id: ${row.id}`);
        console.log(`   - price_from: ${row.price_from}`);
        console.log(`   - category_id: ${row.category_id}`);
        console.log(`   - category: ${row.category}`);
        console.log(`   - is_active: ${row.is_active}`);
      });

      // 2. 첫 번째 상품의 cart_items 조회
      const productId = listingResult.rows[0].id;
      console.log(`\n\n🛒 [cart_items 테이블] listing_id=${productId} 장바구니 항목 조회...\n`);

      const cartResult = await connection.execute(`
        SELECT id, user_id, listing_id, quantity, price_snapshot,
               num_adults, num_children, adult_price, child_price, created_at
        FROM cart_items
        WHERE listing_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [productId]);

      if (cartResult.rows && cartResult.rows.length > 0) {
        console.log('📋 [cart_items] 장바구니 항목:');
        cartResult.rows.forEach((row, i) => {
          console.log(`\n${i + 1}. cart_item_id: ${row.id}`);
          console.log(`   - user_id: ${row.user_id}`);
          console.log(`   - quantity: ${row.quantity}`);
          console.log(`   - price_snapshot: ${row.price_snapshot}`);
          console.log(`   - num_adults: ${row.num_adults}`);
          console.log(`   - adult_price: ${row.adult_price}`);
          console.log(`   - created_at: ${row.created_at}`);
        });
      } else {
        console.log('❌ 장바구니에 해당 상품 없음');
      }

      // 3. 가격 계산 검증
      const listing = listingResult.rows[0];
      console.log(`\n\n🧮 [가격 계산 검증]`);
      console.log(`올바른 단가: 7,500원`);
      console.log(`현재 price_from: ${listing.price_from}원`);

      if (listing.price_from !== 7500 && listing.price_from !== null) {
        console.log(`\n⚠️  listings.price_from 수정 필요: ${listing.price_from} → 7,500`);
        console.log(`\n수정 쿼리:`);
        console.log(`UPDATE listings SET price_from = 7500 WHERE id = ${listing.id};`);
      } else if (listing.price_from === 7500) {
        console.log(`\n✅ listings.price_from 정상: 7,500원`);
      }

    } else {
      console.log('❌ 상품을 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

checkPopupProductPrice();
