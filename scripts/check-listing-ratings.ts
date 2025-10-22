import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function checkListingRatings() {
  const conn = connect(config);

  // 1. listings 테이블에서 rating_count > 0인 항목 확인
  const result = await conn.execute(`
    SELECT id, title, rating_count, rating_avg
    FROM listings
    WHERE rating_count > 0 OR rating_avg > 0
    ORDER BY rating_count DESC
    LIMIT 10
  `);

  console.log('📊 rating_count가 0보다 큰 상품들:');
  if (result.rows.length === 0) {
    console.log('   ✅ 없음 (모두 0으로 정상)');
  } else {
    result.rows.forEach((row: any) => {
      console.log(`   ❌ [상품 ID: ${row.id}] ${row.title}`);
      console.log(`      rating_count: ${row.rating_count}, rating_avg: ${row.rating_avg}`);
    });
  }

  // 2. reviews 테이블의 실제 리뷰 개수 확인
  const reviewsCount = await conn.execute(`
    SELECT COUNT(*) as total FROM reviews
  `);

  console.log(`\n📝 reviews 테이블의 실제 리뷰 개수: ${reviewsCount.rows[0].total}개`);

  // 3. 각 listing의 실제 리뷰 개수 확인
  const listingReviews = await conn.execute(`
    SELECT listing_id, COUNT(*) as actual_count
    FROM reviews
    GROUP BY listing_id
  `);

  if (listingReviews.rows.length > 0) {
    console.log('\n🔍 실제 리뷰가 있는 상품들:');
    for (const row of listingReviews.rows as any[]) {
      const listingData = await conn.execute(
        'SELECT title, rating_count, rating_avg FROM listings WHERE id = ?',
        [row.listing_id]
      );
      const listing = listingData.rows[0] as any;
      console.log(`   [상품 ID: ${row.listing_id}] ${listing.title}`);
      console.log(`      실제 리뷰: ${row.actual_count}개, DB에 저장된 rating_count: ${listing.rating_count}`);
      console.log(`      DB에 저장된 rating_avg: ${listing.rating_avg}`);
    }
  }

  process.exit(0);
}

checkListingRatings().catch(error => {
  console.error('❌ 에러:', error);
  process.exit(1);
});
