const { connect } = require('@planetscale/database');
require('dotenv').config();

async function testReviewSystem() {
  console.log('🧪 리뷰 시스템 테스트\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 팝업 카테고리 리뷰 확인 (참고용)
    console.log('🎪 팝업 카테고리 리뷰 (작동하는 예시):');
    const popupReviews = await connection.execute(`
      SELECT
        r.id,
        r.listing_id,
        r.user_id,
        r.rating,
        LEFT(r.comment_md, 40) as comment,
        l.title as listing_title,
        l.category,
        u.name as user_name
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE l.category = '팝업'
      LIMIT 5
    `);
    console.table(popupReviews.rows);
    console.log(`팝업 리뷰 개수: ${popupReviews.rows?.length || 0}\n`);

    // 2. 테스트 호텔 찾기
    console.log('🏨 "테스트 호텔" 찾기:');
    const hotel = await connection.execute(`
      SELECT
        id,
        title,
        category,
        rating_avg,
        rating_count
      FROM listings
      WHERE title LIKE '%테스트%' AND title LIKE '%호텔%'
      LIMIT 1
    `);

    if (hotel.rows && hotel.rows.length > 0) {
      console.table(hotel.rows);
      const hotelData = hotel.rows[0];
      console.log(`\n✅ 발견: ${hotelData.title} (ID: ${hotelData.id})`);
      console.log(`   평점: ${hotelData.rating_avg} (${hotelData.rating_count}개)`);

      // 3. 이 호텔의 리뷰 확인
      console.log(`\n📝 "${hotelData.title}"의 리뷰:`);
      const hotelReviews = await connection.execute(`
        SELECT
          r.id,
          r.user_id,
          r.rating,
          r.comment_md,
          r.created_at,
          u.name as user_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.listing_id = ?
      `, [hotelData.id]);

      if (hotelReviews.rows && hotelReviews.rows.length > 0) {
        console.table(hotelReviews.rows);
        console.log(`✅ 리뷰 ${hotelReviews.rows.length}개 발견`);
      } else {
        console.log(`⚠️  리뷰 없음 (rating_count는 ${hotelData.rating_count}인데 실제 리뷰는 0개)`);
        console.log('   → listings 테이블의 rating_count가 가짜 데이터일 수 있음\n');
      }

      // 4. 테스트 리뷰 작성 시뮬레이션 (실제로 작성하지는 않음)
      console.log('\n🧪 API 테스트 시뮬레이션:');
      console.log(`GET /api/reviews/${hotelData.id} - 리뷰 조회`);
      console.log(`POST /api/reviews/${hotelData.id} - 리뷰 작성`);
      console.log(`DELETE /api/reviews/edit/[reviewId]?user_id=[userId] - 리뷰 삭제`);
    } else {
      console.log('❌ "테스트 호텔"을 찾을 수 없습니다.\n');

      // 숙박 카테고리 listings 확인
      console.log('🏨 숙박 카테고리 상품 목록:');
      const accommodations = await connection.execute(`
        SELECT
          id,
          title,
          category,
          rating_avg,
          rating_count
        FROM listings
        WHERE category IN ('accommodation', '숙박', 'stay')
        LIMIT 10
      `);
      console.table(accommodations.rows);
    }

    // 5. 전체 리뷰 시스템 상태
    console.log('\n📊 전체 리뷰 시스템 상태:');
    const systemStatus = await connection.execute(`
      SELECT
        COUNT(DISTINCT r.id) as total_reviews,
        COUNT(DISTINCT r.listing_id) as listings_with_reviews,
        COUNT(DISTINCT l.category) as categories_with_reviews,
        GROUP_CONCAT(DISTINCT l.category) as categories
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
    `);
    console.table(systemStatus.rows);

    console.log('\n✅ 테스트 완료!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testReviewSystem();
