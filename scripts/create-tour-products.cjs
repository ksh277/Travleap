const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function createTourProducts() {
  console.log('🌏 여행 카테고리 추가 상품 생성 중...\n');

  const products = [
    { title: '제주 올레길 3코스 당일투어', desc: '아름다운 제주 해안을 따라 걷는 힐링 여행', price: 89000, location: '제주' },
    { title: '부산 감천문화마을 + 태종대 투어', desc: '부산의 핵심 명소를 하루에 돌아보는 패키지', price: 75000, location: '부산' },
    { title: '전주 한옥마을 + 전통시장 투어', desc: '전통과 맛을 동시에 즐기는 전주 여행', price: 68000, location: '전주' }
  ];

  try {
    const categoryId = 1858; // 여행 카테고리 ID

    for (const p of products) {
      const result = await connection.execute(`
        INSERT INTO listings (
          category_id, title, category, short_description,
          price_from, location, is_active, cart_enabled,
          max_capacity, duration,
          created_at, updated_at
        ) VALUES (?, ?, '여행', ?, ?, ?, 1, 1, 20, '1 day', NOW(), NOW())
      `, [categoryId, p.title, p.desc, p.price, p.location]);

      console.log(`✅ ${p.title} (ID: ${result.insertId})`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 여행 카테고리 상품 3개 추가 완료!');
    console.log('\n🌐 테스트 URL: https://travelap.vercel.app/tour');

  } catch (error) {
    console.error('❌ 에러:', error.message);
    throw error;
  }
}

createTourProducts().then(() => {
  console.log('\n✅ 완료');
  process.exit(0);
}).catch(() => {
  console.error('\n❌ 실패');
  process.exit(1);
});
