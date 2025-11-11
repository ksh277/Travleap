const { connect } = require('@planetscale/database');
require('dotenv').config();

async function testCreateReview() {
  console.log('🧪 리뷰 생성 테스트\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 숙박 상품 찾기
    console.log('🏨 테스트용 숙박 상품 찾기:');
    const listing = await connection.execute(`
      SELECT id, title, category, rating_avg, rating_count
      FROM listings
      WHERE category IN ('숙박', 'accommodation', 'stay')
      LIMIT 1
    `);

    if (!listing.rows || listing.rows.length === 0) {
      console.log('❌ 숙박 상품이 없습니다.');
      return;
    }

    const testListing = listing.rows[0];
    console.table([testListing]);
    console.log(`\n✅ 테스트 대상: ${testListing.title} (ID: ${testListing.id})\n`);

    // 2. 테스트 사용자 확인
    console.log('👤 테스트 사용자 확인:');
    const users = await connection.execute(`
      SELECT id, name, email
      FROM users
      LIMIT 1
    `);

    if (!users.rows || users.rows.length === 0) {
      console.log('❌ 사용자가 없습니다. 테스트 사용자를 생성합니다...');
      await connection.execute(`
        INSERT INTO users (name, email, password_hash, created_at)
        VALUES ('테스트 사용자', 'test@example.com', 'test123', NOW())
      `);
      const newUser = await connection.execute(`
        SELECT id, name, email FROM users WHERE email = 'test@example.com'
      `);
      var testUser = newUser.rows[0];
    } else {
      var testUser = users.rows[0];
    }

    console.table([testUser]);
    console.log(`\n✅ 사용자: ${testUser.name} (ID: ${testUser.id})\n`);

    // 3. 리뷰 생성
    console.log('📝 테스트 리뷰 생성 중...');
    const insertResult = await connection.execute(`
      INSERT INTO reviews (
        listing_id,
        user_id,
        rating,
        title,
        comment_md,
        review_images,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      Number(testListing.id),
      Number(testUser.id),
      5,
      '정말 좋았어요!',
      '가족과 함께 다녀왔는데 너무 만족스러웠습니다. 시설도 깨끗하고 직원분들도 친절하셨어요. 다음에 또 방문하고 싶습니다!',
      JSON.stringify([])
    ]);

    const reviewId = insertResult.insertId;
    console.log(`✅ 리뷰 생성 완료! Review ID: ${reviewId}\n`);

    // 4. 생성된 리뷰 확인
    console.log('📋 생성된 리뷰 확인:');
    const review = await connection.execute(`
      SELECT
        r.*,
        u.name as user_name,
        u.email as user_email
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [reviewId]);

    console.table(review.rows);

    // 5. listing의 평균 rating 업데이트
    console.log('\n⚙️ Listing 평균 rating 업데이트 중...');
    await connection.execute(`
      UPDATE listings
      SET
        rating_avg = (
          SELECT AVG(rating) FROM reviews WHERE listing_id = ?
        ),
        rating_count = (
          SELECT COUNT(*) FROM reviews WHERE listing_id = ?
        )
      WHERE id = ?
    `, [Number(testListing.id), Number(testListing.id), Number(testListing.id)]);

    // 6. 업데이트된 listing 확인
    console.log('✅ 업데이트된 Listing 확인:');
    const updatedListing = await connection.execute(`
      SELECT id, title, rating_avg, rating_count
      FROM listings
      WHERE id = ?
    `, [Number(testListing.id)]);

    console.table(updatedListing.rows);

    // 7. 리뷰 목록 조회 (API GET 시뮬레이션)
    console.log('\n📖 리뷰 목록 조회 (GET /api/reviews/${listing.id}):');
    const allReviews = await connection.execute(`
      SELECT
        r.*,
        u.name as user_name,
        u.email as user_email
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.listing_id = ?
      ORDER BY r.created_at DESC
    `, [Number(testListing.id)]);

    console.table(allReviews.rows);
    console.log(`\n✅ 총 ${allReviews.rows.length}개의 리뷰`);

    console.log('\n✅ 모든 테스트 통과!');
    console.log('\n🎯 다음 단계:');
    console.log('1. 프론트엔드에서 리뷰 작성 테스트');
    console.log('2. 리뷰 삭제 기능 테스트');
    console.log('3. 팝업 카테고리와 동일하게 작동하는지 확인');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testCreateReview();
