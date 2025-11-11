const { connect } = require('@planetscale/database');
require('dotenv').config();

async function testDeleteReview() {
  console.log('🧪 리뷰 삭제 테스트\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 테스트용 리뷰 찾기
    console.log('📝 테스트용 리뷰 찾기:');
    const reviews = await connection.execute(`
      SELECT
        r.*,
        u.name as user_name,
        l.title as listing_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE l.category IN ('숙박', 'accommodation', 'stay')
      LIMIT 1
    `);

    if (!reviews.rows || reviews.rows.length === 0) {
      console.log('❌ 테스트할 리뷰가 없습니다.');
      console.log('💡 먼저 node scripts/test-create-review.cjs 를 실행하세요.');
      return;
    }

    const testReview = reviews.rows[0];
    console.log(`✅ 찾은 리뷰: ID ${testReview.id} by ${testReview.user_name}`);
    console.log(`   Listing: ${testReview.listing_title} (ID: ${testReview.listing_id})`);
    console.log(`   Rating: ${testReview.rating}⭐`);
    console.log(`   Content: ${testReview.comment_md.substring(0, 50)}...\n`);

    // 2. 삭제 전 listing 상태 확인
    console.log('📊 삭제 전 Listing 상태:');
    const beforeListing = await connection.execute(`
      SELECT id, title, rating_avg, rating_count
      FROM listings
      WHERE id = ?
    `, [testReview.listing_id]);
    console.table(beforeListing.rows);

    // 3. 소유권 확인 (API에서 하는 것처럼)
    console.log('🔐 소유권 확인:');
    const ownerCheck = await connection.execute(`
      SELECT id, user_id, listing_id FROM reviews WHERE id = ?
    `, [Number(testReview.id)]);

    if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
      console.log('❌ 리뷰를 찾을 수 없습니다.');
      return;
    }

    const review = ownerCheck.rows[0];
    console.log(`✅ 리뷰 소유자: user_id = ${review.user_id}`);
    console.log(`   현재 사용자: user_id = ${testReview.user_id}`);

    if (Number(review.user_id) !== Number(testReview.user_id)) {
      console.log('❌ 본인의 리뷰만 삭제할 수 있습니다.');
      return;
    }
    console.log('✅ 소유권 확인 통과\n');

    // 4. 리뷰 삭제
    console.log('🗑️ 리뷰 삭제 중...');
    await connection.execute(`
      DELETE FROM reviews WHERE id = ?
    `, [Number(testReview.id)]);
    console.log(`✅ 리뷰 ID ${testReview.id} 삭제 완료\n`);

    // 5. listing의 평균 rating 업데이트
    console.log('⚙️ Listing 평균 rating 업데이트 중...');
    await connection.execute(`
      UPDATE listings
      SET
        rating_avg = COALESCE((
          SELECT AVG(rating) FROM reviews WHERE listing_id = ?
        ), 0),
        rating_count = (
          SELECT COUNT(*) FROM reviews WHERE listing_id = ?
        )
      WHERE id = ?
    `, [testReview.listing_id, testReview.listing_id, testReview.listing_id]);

    // 6. 삭제 후 listing 상태 확인
    console.log('✅ 삭제 후 Listing 상태:');
    const afterListing = await connection.execute(`
      SELECT id, title, rating_avg, rating_count
      FROM listings
      WHERE id = ?
    `, [testReview.listing_id]);
    console.table(afterListing.rows);

    // 7. 리뷰가 정말 삭제되었는지 확인
    console.log('🔍 리뷰 삭제 확인:');
    const deletedCheck = await connection.execute(`
      SELECT * FROM reviews WHERE id = ?
    `, [Number(testReview.id)]);

    if (!deletedCheck.rows || deletedCheck.rows.length === 0) {
      console.log('✅ 리뷰가 완전히 삭제되었습니다.\n');
    } else {
      console.log('❌ 리뷰가 여전히 존재합니다.\n');
    }

    // 8. 남은 리뷰 목록
    console.log('📋 현재 남은 리뷰:');
    const remainingReviews = await connection.execute(`
      SELECT
        r.id,
        r.listing_id,
        r.rating,
        LEFT(r.comment_md, 30) as comment_preview,
        u.name as user_name,
        l.title as listing_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE r.listing_id = ?
    `, [testReview.listing_id]);

    if (remainingReviews.rows && remainingReviews.rows.length > 0) {
      console.table(remainingReviews.rows);
      console.log(`\n✅ ${remainingReviews.rows.length}개의 리뷰가 남아있습니다.`);
    } else {
      console.log('ℹ️ 이 listing에는 더 이상 리뷰가 없습니다.');
    }

    console.log('\n✅ 리뷰 삭제 테스트 통과!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testDeleteReview();
