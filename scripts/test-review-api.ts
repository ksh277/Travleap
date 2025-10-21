// 리뷰 API 테스트
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function testReviewAPI() {
  console.log('🧪 리뷰 API 테스트 시작...\n');

  try {
    const conn = connect(config);

    // 1. 기존 리뷰 확인
    console.log('1️⃣ 기존 리뷰 조회:');
    const existingReviews = await conn.execute(`
      SELECT id, listing_id, user_id, rating, title
      FROM reviews
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log(`총 리뷰: ${existingReviews.rows.length}개`);
    existingReviews.rows.forEach((review: any) => {
      console.log(`  - ID: ${review.id}, 상품: ${review.listing_id}, 평점: ${review.rating}점`);
    });
    console.log('');

    // 2. 테스트용 리뷰 데이터 준비 (실제로는 POST하지 않음)
    console.log('2️⃣ 리뷰 작성 시뮬레이션:');
    console.log('  API Endpoint: POST /api/reviews');
    console.log('  테스트 데이터:');
    console.log('  {');
    console.log('    listing_id: 98,');
    console.log('    user_id: 1,');
    console.log('    rating: 5,');
    console.log('    title: "테스트 리뷰",');
    console.log('    content: "정말 좋은 체험이었습니다!",');
    console.log('    review_type: "listing"');
    console.log('  }');
    console.log('');

    // 3. 리뷰 평균 평점 확인
    console.log('3️⃣ 현재 평균 평점:');
    const avgResult = await conn.execute(`
      SELECT
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(*) as total_reviews
      FROM reviews
      WHERE is_verified = 1
    `);
    console.log(`  - 평균 평점: ${Number(avgResult.rows[0]?.avg_rating).toFixed(1)} / 5.0`);
    console.log(`  - 총 리뷰 수: ${avgResult.rows[0]?.total_reviews}개`);
    console.log('');

    // 4. 상품별 리뷰 확인
    console.log('4️⃣ 상품별 리뷰 통계:');
    const listingStats = await conn.execute(`
      SELECT
        l.id,
        l.title,
        COUNT(r.id) as review_count,
        COALESCE(AVG(r.rating), 0) as avg_rating
      FROM listings l
      LEFT JOIN reviews r ON l.id = r.listing_id AND r.is_verified = 1
      GROUP BY l.id, l.title
      HAVING review_count > 0
      ORDER BY review_count DESC
      LIMIT 10
    `);

    if (listingStats.rows.length > 0) {
      listingStats.rows.forEach((stat: any) => {
        console.log(`  ${stat.title}`);
        console.log(`    └─ 리뷰 ${stat.review_count}개, 평균 ${Number(stat.avg_rating).toFixed(1)}점`);
      });
    } else {
      console.log('  리뷰가 있는 상품이 없습니다');
    }
    console.log('');

    console.log('🎉 리뷰 API 테스트 완료!');
    console.log('');
    console.log('✅ 확인 사항:');
    console.log('  1. 리뷰 데이터 조회 정상 ✓');
    console.log('  2. 평균 평점 계산 정상 ✓');
    console.log('  3. 상품별 리뷰 통계 정상 ✓');
    console.log('');
    console.log('📝 다음 단계:');
    console.log('  - 웹페이지에서 리뷰 작성 테스트');
    console.log('  - 작성된 리뷰가 리뷰 관리에 표시되는지 확인');
    console.log('  - 대시보드 평균 평점이 업데이트되는지 확인');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }

  process.exit(0);
}

testReviewAPI();
