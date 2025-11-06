const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function main() {
  console.log('🚀 카테고리별 상품 생성 시작...\n');

  try {
    // 팝업의 category_id 사용 (1860)
    const categoryId = 1860;

    const products = [
      { category: '숙박', title: '제주 오션뷰 호텔', desc: '제주 바다가 한눈에 보이는 프리미엄 객실', price: 150000 },
      { category: '음식점', title: '서울 한식당', desc: '전통 한식의 깊은 맛을 현대적으로 재해석', price: 50000 },
      { category: '관광지', title: '경복궁 가이드 투어', desc: '전문 문화해설사와 함께하는 경복궁 투어', price: 30000 },
      { category: '이벤트', title: '서울 재즈 페스티벌', desc: '세계적인 재즈 아티스트들과 함께하는 음악 축제', price: 80000 },
      { category: '체험', title: '한옥마을 전통문화 체험', desc: '한복, 전통 차, 한지 공예를 포함한 3시간 코스', price: 45000 }
    ];

    const created = [];

    for (const p of products) {
      const result = await connection.execute(`
        INSERT INTO listings (
          category_id, title, category, short_description,
          price_from, is_active, cart_enabled,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
      `, [categoryId, p.title, p.category, p.desc, p.price]);

      created.push({ ...p, id: result.insertId });
      console.log(`✅ ${p.category} - ${p.title} (ID: ${result.insertId})`);
    }

    console.log('\n\n📊 생성된 상품 URL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    created.forEach(p => {
      let path = p.category === '숙박' ? 'hotel'
        : p.category === '음식점' ? 'restaurant'
        : p.category === '관광지' ? 'attraction'
        : p.category === '이벤트' ? 'event'
        : 'experience';

      console.log(`\n${p.category}:`);
      console.log(`  ID: ${p.id}`);
      console.log(`  URL: https://travelap.vercel.app/${path}/${p.id}`);
    });

    console.log('\n');

  } catch (error) {
    console.error('❌ 에러:', error.message);
    throw error;
  }
}

main().then(() => {
  console.log('✅ 완료');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 실패');
  process.exit(1);
});
