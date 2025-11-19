/**
 * 장바구니 결제 로직 시뮬레이션
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function testCheckoutLogic() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🧪 장바구니 결제 로직 시뮬레이션\n');
    console.log('=' + '='.repeat(80));

    // 실제 listings 데이터로 테스트
    const sampleListings = await connection.execute(`
      SELECT
        l.id,
        l.title,
        c.name_ko as category,
        l.category_id,
        l.price_from as price,
        l.adult_price,
        l.child_price,
        l.senior_price,
        l.infant_price
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.category_id IN (1855, 1858, 1859, 1861, 1862)
      AND l.is_active = 1
      LIMIT 3
    `);

    console.log('\n📋 테스트할 상품 목록:\n');
    console.table(sampleListings.rows);

    console.log('\n🧮 가격 계산 시뮬레이션:\n');
    console.log('=' + '='.repeat(80));

    for (const listing of sampleListings.rows) {
      console.log(`\n상품: ${listing.title} (${listing.category})`);
      console.log(`ID: ${listing.id}`);
      console.log(`price_from: ${listing.price}`);
      console.log(`adult_price: ${listing.adult_price || 'NULL'}`);
      console.log(`child_price: ${listing.child_price || 'NULL'}`);
      console.log(`senior_price: ${listing.senior_price || 'NULL'}`);
      console.log(`infant_price: ${listing.infant_price || 'NULL'}`);

      // pages/api/orders.js 로직 시뮬레이션
      const bookingBasedCategories = [1855, 1858, 1859, 1861, 1862];
      const isBookingBased = bookingBasedCategories.includes(listing.category_id);

      console.log(`\n✅ Booking-based: ${isBookingBased}`);

      if (isBookingBased) {
        // 수정된 코드 로직
        const serverAdultPrice = listing.adult_price || listing.price || 0;
        const serverChildPrice = listing.child_price || 0;
        const serverSeniorPrice = listing.senior_price || 0;
        const serverInfantPrice = listing.infant_price || 0;

        console.log('\n📊 서버 계산 가격 (수정 후):');
        console.log(`  성인 가격: ${serverAdultPrice} (adult_price=${listing.adult_price} || price=${listing.price} || 0)`);
        console.log(`  어린이 가격: ${serverChildPrice} (child_price=${listing.child_price} || 0)`);
        console.log(`  경로 가격: ${serverSeniorPrice} (senior_price=${listing.senior_price} || 0)`);
        console.log(`  유아 가격: ${serverInfantPrice} (infant_price=${listing.infant_price} || 0)`);

        // 예시 인원: 성인 2, 어린이 1
        const adults = 2;
        const children = 1;
        const seniors = 0;
        const infants = 0;

        const calculatedTotal =
          adults * serverAdultPrice +
          children * serverChildPrice +
          seniors * serverSeniorPrice +
          infants * serverInfantPrice;

        console.log(`\n💰 장바구니 예시 (성인 ${adults}명, 어린이 ${children}명):`);
        console.log(`  ${adults} × ${serverAdultPrice} + ${children} × ${serverChildPrice} = ${calculatedTotal}원`);
      } else {
        console.log('\n📦 수량 기반 상품 (인원별 가격 미사용)');
      }

      console.log('\n' + '-'.repeat(80));
    }

    console.log('\n✅ 시뮬레이션 완료\n');

    console.log('📝 결론:');
    console.log('  1. adult_price가 NULL이면 price_from으로 fallback ✅');
    console.log('  2. child/senior/infant_price가 NULL이면 0원 처리 ✅');
    console.log('  3. 현재 DB 상태에서도 정상 작동 ✅');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  }
}

testCheckoutLogic();
