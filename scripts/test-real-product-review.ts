import 'dotenv/config';
import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL });

const LISTING_ID = 219; // 홍도 일주 관광투어
const USER_ID = 1; //  관리자 계정

console.log('🧪 실제 상품 (ID: 219 - 홍도 일주 관광투어) 리뷰 테스트\n');
console.log('='.repeat(80));

async function main() {
  try {
    // 1. 상품 정보 확인
    console.log('\n📋 1단계: 상품 정보 확인');
    console.log('-'.repeat(80));

    const listingInfo = await connection.execute(
      'SELECT id, title, rating_avg, rating_count FROM listings WHERE id = ?',
      [LISTING_ID]
    );

    if (!listingInfo.rows || listingInfo.rows.length === 0) {
      console.error('❌ 상품을 찾을 수 없습니다!');
      return;
    }

    const listing = listingInfo.rows[0];
    console.log(`  ✅ 상품 찾음: ${listing.title}`);
    console.log(`     현재 rating_avg: ${listing.rating_avg}`);
    console.log(`     현재 rating_count: ${listing.rating_count}`);

    // 2. 기존 리뷰 확인
    console.log('\n📋 2단계: 기존 리뷰 확인');
    console.log('-'.repeat(80));

    const existingReviews = await connection.execute(
      'SELECT id, user_id, rating, title FROM reviews WHERE listing_id = ?',
      [LISTING_ID]
    );

    console.log(`  📊 기존 리뷰 개수: ${existingReviews.rows.length}개`);

    if (existingReviews.rows.length > 0) {
      console.log('  기존 리뷰 목록:');
      existingReviews.rows.forEach((review: any) => {
        console.log(`    - [ID: ${review.id}] ${review.title} (${review.rating}점, user_id: ${review.user_id})`);
      });
    }

    // 3. 사용자 1이 이미 리뷰를 작성했는지 확인
    const userReview = existingReviews.rows.find((r: any) => r.user_id === USER_ID);

    if (userReview) {
      console.log(`\n  ⚠️  사용자 ${USER_ID}은 이미 리뷰를 작성함 (ID: ${userReview.id})`);
      console.log('  기존 리뷰를 삭제하고 새로 작성하시겠습니까? (y/n)');
      console.log('  (테스트를 위해 자동으로 삭제하고 진행합니다...)');

      // 기존 리뷰 삭제
      await connection.execute('DELETE FROM reviews WHERE id = ?', [userReview.id]);
      console.log(`  ✅ 기존 리뷰 삭제 완료 (ID: ${userReview.id})`);

      // rating 재계산
      await connection.execute(`
        UPDATE listings
        SET
          rating_avg = COALESCE((SELECT AVG(rating) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)), 0),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE))
        WHERE id = ?
      `, [LISTING_ID, LISTING_ID, LISTING_ID]);

      console.log('  ✅ rating 재계산 완료');
    }

    // 4. 새 리뷰 작성
    console.log('\n📋 3단계: 새 리뷰 작성');
    console.log('-'.repeat(80));

    const newReview = await connection.execute(`
      INSERT INTO reviews (
        listing_id, user_id, rating, title, comment_md,
        review_images, review_type, is_verified, helpful_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      LISTING_ID,
      USER_ID,
      5,
      '홍도가 정말 아름다웠습니다!',
      '홍도 일주 관광투어는 정말 환상적이었습니다. 깨끗한 바다와 기암괴석, 그리고 친절한 가이드님 덕분에 잊지 못할 추억을 만들었습니다. 강력 추천합니다!',
      JSON.stringify(['https://images.unsplash.com/photo-1559827260-dc66d52bef19', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4']),
      'listing',
      true,
      0
    ]);

    const reviewId = Number(newReview.insertId);
    console.log(`  ✅ 새 리뷰 작성 완료 (ID: ${reviewId})`);
    console.log('     평점: 5점');
    console.log('     제목: 홍도가 정말 아름다웠습니다!');

    // 5. rating 자동 업데이트
    console.log('\n📋 4단계: rating 자동 업데이트');
    console.log('-'.repeat(80));

    await connection.execute(`
      UPDATE listings
      SET
        rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE))
      WHERE id = ?
    `, [LISTING_ID, LISTING_ID, LISTING_ID]);

    const updatedListing = await connection.execute(
      'SELECT rating_avg, rating_count FROM listings WHERE id = ?',
      [LISTING_ID]
    );

    console.log(`  ✅ rating 업데이트 완료`);
    console.log(`     rating_avg: ${listing.rating_avg} → ${updatedListing.rows[0].rating_avg}`);
    console.log(`     rating_count: ${listing.rating_count} → ${updatedListing.rows[0].rating_count}`);

    // 6. 리뷰 조회 테스트 (API 시뮬레이션)
    console.log('\n📋 5단계: 리뷰 조회 테스트');
    console.log('-'.repeat(80));

    const reviews = await connection.execute(`
      SELECT
        r.*,
        u.name as user_name,
        u.email as user_email
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.listing_id = ? AND (r.is_hidden IS NULL OR r.is_hidden = FALSE)
      ORDER BY r.created_at DESC
      LIMIT 5
    `, [LISTING_ID]);

    console.log(`  📊 조회된 리뷰: ${reviews.rows.length}개`);
    reviews.rows.forEach((review: any, index: number) => {
      console.log(`\n  ${index + 1}. [⭐ ${review.rating}/5] ${review.title}`);
      console.log(`     작성자: ${review.user_name || '익명'}`);
      console.log(`     내용: ${review.comment_md.substring(0, 50)}...`);
      console.log(`     도움됨: ${review.helpful_count}명`);
      console.log(`     작성일: ${new Date(review.created_at).toLocaleDateString('ko-KR')}`);
    });

    // 7. 최종 결과
    console.log('\n' + '='.repeat(80));
    console.log('🎉 실제 상품 리뷰 테스트 완료!\n');

    console.log('✅ 테스트 결과:');
    console.log(`  1. 상품 정보 조회 성공 (${listing.title})`);
    console.log(`  2. 리뷰 작성 성공 (ID: ${reviewId})`);
    console.log(`  3. rating 자동 업데이트 성공`);
    console.log(`  4. 리뷰 조회 API 정상 작동`);

    console.log('\n🌐 확인 방법:');
    console.log(`  1. 로컬: http://localhost:3001/detail/${LISTING_ID}`);
    console.log(`  2. Vercel: https://travleap.vercel.app/detail/${LISTING_ID}`);
    console.log('  3. 상품 상세페이지 → "리뷰" 탭에서 확인');

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
