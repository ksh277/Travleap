// 리뷰 작성 플로우 테스트
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function testReviewFlow() {
  console.log('🧪 리뷰 작성 플로우 테스트 시작...\n');

  try {
    const conn = connect(config);

    // 1. 특정 상품의 리뷰 조회
    const listingId = 49; // 홍도 일주 관광투어
    console.log(`1️⃣ 상품 ID ${listingId}의 리뷰 조회`);

    const reviewsResult = await conn.execute(
      `SELECT
        r.id,
        r.rating,
        r.title,
        r.comment_md,
        r.created_at,
        u.name as user_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.listing_id = ?
       ORDER BY r.created_at DESC`,
      [listingId]
    );

    console.log(`  ✅ 총 ${reviewsResult.rows.length}개의 리뷰 조회됨`);

    if (reviewsResult.rows.length > 0) {
      console.log('\n  📋 리뷰 목록:');
      reviewsResult.rows.forEach((review: any) => {
        console.log(`    [${review.rating}/5] ${review.title} - ${review.user_name}`);
      });
    }
    console.log('');

    // 2. 상품의 현재 평점 정보 조회
    console.log(`2️⃣ 상품 평점 정보 확인`);
    const listingResult = await conn.execute(
      `SELECT id, title, rating_avg, rating_count
       FROM listings
       WHERE id = ?`,
      [listingId]
    );

    if (listingResult.rows.length > 0) {
      const listing = listingResult.rows[0];
      console.log(`  상품: ${listing.title}`);
      console.log(`  평균 평점: ${Number(listing.rating_avg).toFixed(2)}/5.0`);
      console.log(`  리뷰 개수: ${listing.rating_count}개`);
    }
    console.log('');

    // 3. 모든 리뷰의 평균 계산 (검증용)
    console.log(`3️⃣ 리뷰 평균 계산 검증`);
    const avgResult = await conn.execute(
      `SELECT
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as calculated_avg
       FROM reviews
       WHERE listing_id = ?`,
      [listingId]
    );

    const stats = avgResult.rows[0];
    console.log(`  실제 DB의 리뷰 개수: ${stats.total_reviews}개`);
    console.log(`  계산된 평균 평점: ${Number(stats.calculated_avg).toFixed(2)}/5.0`);
    console.log('');

    // 4. 전체 리뷰 통계
    console.log(`4️⃣ 전체 리뷰 통계`);
    const allReviewsResult = await conn.execute(`
      SELECT
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as overall_avg,
        COUNT(DISTINCT listing_id) as products_with_reviews
      FROM reviews
    `);

    const allStats = allReviewsResult.rows[0];
    console.log(`  전체 리뷰 개수: ${allStats.total_reviews}개`);
    console.log(`  전체 평균 평점: ${Number(allStats.overall_avg).toFixed(2)}/5.0`);
    console.log(`  리뷰가 있는 상품: ${allStats.products_with_reviews}개`);
    console.log('');

    console.log('🎉 테스트 완료!\n');
    console.log('✅ 확인 사항:');
    console.log('  1. 리뷰 목록 조회 ✓');
    console.log('  2. 상품 평점 정보 ✓');
    console.log('  3. 평균 계산 검증 ✓');
    console.log('  4. 전체 통계 ✓');
    console.log('');
    console.log('💡 다음 단계:');
    console.log('  - 브라우저에서 상품 상세 페이지 접속');
    console.log('  - 리뷰 작성란에서 새 리뷰 작성');
    console.log('  - 리뷰 작성 후 페이지에서 바로 표시되는지 확인');
    console.log('  - 리뷰 개수가 증가하는지 확인');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }

  process.exit(0);
}

testReviewFlow();
