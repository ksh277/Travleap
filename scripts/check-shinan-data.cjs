require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_DATABASE_URL);

(async () => {
  try {
    console.log('🔍 신안 관광지 데이터 확인...\n');

    // 1. listings에서 신안 관련 데이터 확인
    const listings = await sql`
      SELECT id, title, category, location
      FROM listings
      WHERE location LIKE '%신안%' OR title LIKE '%신안%'
      LIMIT 10
    `;
    console.log('📍 Listings (신안):');
    console.log(JSON.stringify(listings, null, 2));
    console.log(`총 ${listings.length}개\n`);

    // 2. 모든 카테고리 확인
    const categories = await sql`
      SELECT DISTINCT category
      FROM listings
      ORDER BY category
    `;
    console.log('📂 모든 카테고리:');
    console.log(categories.map(c => c.category).join(', '));
    console.log('');

    // 3. 이벤트/행사 카테고리 확인
    const events = await sql`
      SELECT id, title, category, location
      FROM listings
      WHERE category IN ('이벤트', 'event', '행사', 'festival', '축제')
      LIMIT 5
    `;
    console.log('🎉 이벤트/행사:');
    console.log(JSON.stringify(events, null, 2));
    console.log(`총 ${events.length}개\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
