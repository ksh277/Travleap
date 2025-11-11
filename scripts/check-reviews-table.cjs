const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkReviewsTable() {
  console.log('🔍 reviews 테이블 확인 중...\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. reviews 테이블 구조 확인
    console.log('📋 테이블 구조:');
    const structure = await connection.execute('DESCRIBE reviews');
    console.table(structure.rows);

    // 2. reviews 데이터 샘플 확인
    console.log('\n📊 리뷰 데이터 샘플 (최근 5개):');
    const samples = await connection.execute(`
      SELECT
        r.id,
        r.listing_id,
        r.user_id,
        r.rating,
        r.title,
        LEFT(r.comment_md, 50) as comment_preview,
        r.helpful_count,
        r.created_at,
        u.name as user_name,
        l.title as listing_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    console.table(samples.rows);

    // 3. 카테고리별 리뷰 통계
    console.log('\n📈 카테고리별 리뷰 통계:');
    const stats = await connection.execute(`
      SELECT
        l.category,
        COUNT(r.id) as review_count,
        AVG(r.rating) as avg_rating,
        MIN(r.rating) as min_rating,
        MAX(r.rating) as max_rating
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      GROUP BY l.category
      ORDER BY review_count DESC
    `);
    console.table(stats.rows);

    // 4. 숙박(accommodation) 카테고리 리뷰 확인
    console.log('\n🏨 숙박 카테고리 리뷰:');
    const accommodationReviews = await connection.execute(`
      SELECT
        r.id,
        r.listing_id,
        r.user_id,
        r.rating,
        r.title,
        LEFT(r.comment_md, 30) as comment_preview,
        u.name as user_name,
        l.title as listing_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE l.category IN ('accommodation', '숙박', 'stay')
      ORDER BY r.created_at DESC
      LIMIT 10
    `);

    if (accommodationReviews.rows && accommodationReviews.rows.length > 0) {
      console.table(accommodationReviews.rows);
      console.log(`\n✅ 숙박 리뷰 ${accommodationReviews.rows.length}개 발견`);
    } else {
      console.log('⚠️  숙박 카테고리 리뷰 없음');
    }

    // 5. 전체 통계
    console.log('\n📊 전체 통계:');
    const totalStats = await connection.execute(`
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        COUNT(DISTINCT listing_id) as listings_with_reviews,
        COUNT(DISTINCT user_id) as users_who_reviewed
      FROM reviews
    `);
    console.table(totalStats.rows);

    console.log('\n✅ reviews 테이블 확인 완료!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkReviewsTable();
