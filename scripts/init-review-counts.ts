/**
 * listings 테이블의 rating_count와 rating_avg를 초기화
 *
 * - 모든 리스팅을 0으로 초기화
 * - 실제 리뷰가 있는 리스팅만 카운트 업데이트
 * - 리뷰가 없으면 0으로 표시됨
 */

import 'dotenv/config';
import { connect } from '@planetscale/database';

const db = connect({ url: process.env.DATABASE_URL! });

async function initReviewCounts() {
  try {
    console.log('🔄 리뷰 카운트 초기화 시작...\n');

    // 1. 모든 listings의 rating_count와 rating_avg를 0으로 초기화
    console.log('1️⃣  모든 listings를 0으로 초기화 중...');
    const initResult = await db.execute(`
      UPDATE listings
      SET rating_count = 0, rating_avg = 0
      WHERE 1=1
    `);
    console.log(`   ✅ ${(initResult as any).rowsAffected || 0}개 리스팅 초기화 완료\n`);

    // 2. 실제 리뷰가 있는 listings만 업데이트
    console.log('2️⃣  실제 리뷰 데이터 기반으로 업데이트 중...');
    const updateResult = await db.execute(`
      UPDATE listings l
      INNER JOIN (
        SELECT
          listing_id,
          COUNT(*) as review_count,
          AVG(rating) as avg_rating
        FROM reviews
        GROUP BY listing_id
      ) r ON l.id = r.listing_id
      SET
        l.rating_count = r.review_count,
        l.rating_avg = r.avg_rating
    `);
    console.log(`   ✅ ${(updateResult as any).rowsAffected || 0}개 리스팅 업데이트 완료\n`);

    // 3. 결과 확인
    console.log('3️⃣  결과 확인...\n');

    const statsResult = await db.execute(`
      SELECT
        COUNT(*) as total_listings,
        SUM(CASE WHEN rating_count > 0 THEN 1 ELSE 0 END) as with_reviews,
        SUM(CASE WHEN rating_count = 0 THEN 1 ELSE 0 END) as without_reviews,
        AVG(rating_avg) as overall_avg
      FROM listings
      WHERE is_published = 1 AND is_active = 1
    `);

    const stats = (statsResult.rows as any[])[0];
    console.log('📊 통계:');
    console.log(`   전체 리스팅: ${stats.total_listings}개`);
    console.log(`   리뷰 있음: ${stats.with_reviews}개`);
    console.log(`   리뷰 없음 (0으로 표시): ${stats.without_reviews}개`);
    console.log(`   전체 평균 평점: ${Number(stats.overall_avg || 0).toFixed(2)}점\n`);

    // 4. 상위 리뷰 리스팅 확인
    const topResult = await db.execute(`
      SELECT
        id,
        title,
        rating_count,
        ROUND(rating_avg, 2) as rating_avg,
        category_id
      FROM listings
      WHERE rating_count > 0
      ORDER BY rating_count DESC, rating_avg DESC
      LIMIT 10
    `);

    const topListings = topResult.rows as any[];
    if (topListings.length > 0) {
      console.log('🏆 리뷰가 많은 상위 10개 리스팅:');
      topListings.forEach((listing, idx) => {
        console.log(`   ${idx + 1}. ${listing.title}`);
        console.log(`      평점: ${listing.rating_avg}점 (리뷰 ${listing.rating_count}개)\n`);
      });
    }

    console.log('✅ 완료! 이제 리뷰 카운트가 0부터 제대로 표시됩니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

initReviewCounts();
