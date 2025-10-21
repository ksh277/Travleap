// 리뷰 통계 확인
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function checkReviewStats() {
  console.log('🔍 리뷰 통계 확인 시작...\n');

  try {
    const conn = connect(config);

    // 1. 전체 리뷰 확인
    console.log('1️⃣ 전체 리뷰 데이터:');
    const allReviewsResult = await conn.execute(`
      SELECT
        id,
        listing_id,
        user_id,
        rating,
        title,
        comment_md,
        is_verified,
        review_type,
        created_at
      FROM reviews
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`총 리뷰 수: ${allReviewsResult.rows.length}개`);
    allReviewsResult.rows.forEach((review: any) => {
      console.log(`  - ID: ${review.id}, 평점: ${review.rating}점, 제목: ${review.title}`);
      console.log(`    타입: ${review.review_type}, 인증: ${review.is_verified ? '✓' : '✗'}`);
    });
    console.log('');

    // 2. 평균 평점 계산 (전체)
    console.log('2️⃣ 평균 평점 계산 (전체 리뷰):');
    const avgAllResult = await conn.execute(`
      SELECT
        COALESCE(AVG(rating), 0) as avgRating,
        COUNT(*) as totalReviews
      FROM reviews
    `);
    console.log(`  - 전체 평균: ${Number(avgAllResult.rows[0]?.avgRating).toFixed(1)} / 5.0`);
    console.log(`  - 전체 리뷰 수: ${avgAllResult.rows[0]?.totalReviews}개\n`);

    // 3. 평균 평점 계산 (인증된 리뷰만)
    console.log('3️⃣ 평균 평점 계산 (인증된 리뷰):');
    const avgVerifiedResult = await conn.execute(`
      SELECT
        COALESCE(AVG(rating), 0) as avgRating,
        COUNT(*) as totalReviews
      FROM reviews
      WHERE is_verified = 1
    `);
    console.log(`  - 인증된 평균: ${Number(avgVerifiedResult.rows[0]?.avgRating).toFixed(1)} / 5.0`);
    console.log(`  - 인증된 리뷰 수: ${avgVerifiedResult.rows[0]?.totalReviews}개\n`);

    // 4. listing 타입별 리뷰 확인
    console.log('4️⃣ 리뷰 타입별 통계:');
    const typeStatsResult = await conn.execute(`
      SELECT
        review_type,
        COUNT(*) as count,
        AVG(rating) as avg_rating,
        SUM(is_verified) as verified_count
      FROM reviews
      GROUP BY review_type
    `);
    typeStatsResult.rows.forEach((stat: any) => {
      console.log(`  ${stat.review_type}: ${stat.count}개 (평균 ${Number(stat.avg_rating).toFixed(1)}점, 인증 ${stat.verified_count}개)`);
    });
    console.log('');

    // 5. 대시보드 API 쿼리와 동일한 방식으로 확인
    console.log('5️⃣ 대시보드 API와 동일한 쿼리:');
    const dashboardResult = await conn.execute(`
      SELECT
        COALESCE(AVG(rating), 0) as avgRating,
        COUNT(*) as totalReviews
      FROM reviews
      WHERE is_verified = 1
    `);
    console.log(`  - 평균 평점: ${Number(dashboardResult.rows[0]?.avgRating).toFixed(1)}`);
    console.log(`  - 총 리뷰: ${dashboardResult.rows[0]?.totalReviews}개\n`);

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  process.exit(0);
}

checkReviewStats();
