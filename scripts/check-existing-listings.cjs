/**
 * 기존 상품 확인 및 카테고리별 필터링
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function checkExistingListings() {
  console.log('🔍 기존 상품 확인 중...\n');

  try {
    // 카테고리별 상품 조회
    const categories = ['숙박', '음식점', '관광지', '이벤트', '체험', '팝업'];

    for (const category of categories) {
      const result = await connection.execute(`
        SELECT id, title, category, price_from, address, is_active
        FROM listings
        WHERE category = ? AND is_active = 1
        ORDER BY created_at DESC
        LIMIT 3
      `, [category]);

      console.log(`\n📂 ${category} 카테고리:`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (result.rows && result.rows.length > 0) {
        result.rows.forEach((listing, index) => {
          console.log(`${index + 1}. [ID: ${listing.id}] ${listing.title}`);
          console.log(`   가격: ${listing.price_from?.toLocaleString()}원`);
          console.log(`   주소: ${listing.address || 'N/A'}`);

          // URL 생성
          let url = '';
          if (category === '숙박') url = `https://travelap.vercel.app/hotel/${listing.id}`;
          else if (category === '음식점') url = `https://travelap.vercel.app/restaurant/${listing.id}`;
          else if (category === '관광지') url = `https://travelap.vercel.app/attraction/${listing.id}`;
          else if (category === '이벤트') url = `https://travelap.vercel.app/event/${listing.id}`;
          else if (category === '체험') url = `https://travelap.vercel.app/experience/${listing.id}`;
          else if (category === '팝업') url = `https://travelap.vercel.app/popup/${listing.id}`;

          console.log(`   URL: ${url}\n`);
        });
      } else {
        console.log(`   ❌ 상품 없음\n`);
      }
    }

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

checkExistingListings()
  .then(() => {
    console.log('\n✅ 확인 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 실패:', error);
    process.exit(1);
  });
