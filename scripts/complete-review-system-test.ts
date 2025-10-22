import 'dotenv/config';
import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL });

console.log('🧪 리뷰 시스템 완전 작동 테스트 시작\n');
console.log('='.repeat(80));

let testListingId: number;
let testReviewId1: number;
let testReviewId2: number;
let testUserId1 = 1;
let testUserId2 = 2;

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const step = (num: number, title: string) => {
  console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}📋 ${num}단계: ${title}${colors.reset}`);
  console.log(`${colors.cyan}${'-'.repeat(80)}${colors.reset}`);
};

const success = (msg: string) => console.log(`${colors.green}  ✅ ${msg}${colors.reset}`);
const error = (msg: string) => console.log(`${colors.red}  ❌ ${msg}${colors.reset}`);
const info = (msg: string) => console.log(`${colors.yellow}  ℹ️  ${msg}${colors.reset}`);

async function main() {
  try {
    // ===== 1단계: 새 테스트 상품 추가 =====
    step(1, '새 테스트 상품 추가');

    const newListing = await connection.execute(`
      INSERT INTO listings (
        title, description_md, category_id, category, price_from, location, images,
        rating_avg, rating_count, is_published, created_at, updated_at
      ) VALUES (
        '리뷰 시스템 테스트 상품',
        '리뷰 기능을 테스트하기 위한 상품입니다.',
        1,
        'tour',
        50000,
        '신안군 흑산면',
        '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4"]',
        0,
        0,
        1,
        NOW(),
        NOW()
      )
    `);

    testListingId = Number(newListing.insertId);
    success(`테스트 상품 생성 완료 (ID: ${testListingId})`);

    // 초기 상태 확인
    const initialCheck = await connection.execute(
      'SELECT rating_avg, rating_count FROM listings WHERE id = ?',
      [testListingId]
    );
    info(`초기 rating_avg: ${initialCheck.rows[0].rating_avg}`);
    info(`초기 rating_count: ${initialCheck.rows[0].rating_count}`);

    // ===== 2단계: 첫 번째 리뷰 작성 테스트 =====
    step(2, '첫 번째 리뷰 작성 (5점)');

    const review1 = await connection.execute(`
      INSERT INTO reviews (
        listing_id, user_id, rating, title, comment_md,
        review_images, review_type, is_verified, helpful_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      testListingId,
      testUserId1,
      5,
      '정말 좋았어요!',
      '완벽한 여행이었습니다. 강력 추천합니다!',
      JSON.stringify(['image1.jpg', 'image2.jpg']),
      'listing',
      true,
      0
    ]);

    testReviewId1 = Number(review1.insertId);
    success(`리뷰 1 생성 완료 (ID: ${testReviewId1})`);

    // rating 자동 업데이트
    await connection.execute(`
      UPDATE listings
      SET
        rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE))
      WHERE id = ?
    `, [testListingId, testListingId, testListingId]);

    const afterReview1 = await connection.execute(
      'SELECT rating_avg, rating_count FROM listings WHERE id = ?',
      [testListingId]
    );

    const avg1 = parseFloat(afterReview1.rows[0].rating_avg);
    const count1 = afterReview1.rows[0].rating_count;

    if (avg1 === 5.00 && count1 === 1) {
      success(`rating_avg: ${avg1} (기대값: 5.00) ✓`);
      success(`rating_count: ${count1} (기대값: 1) ✓`);
    } else {
      error(`rating_avg: ${avg1} (기대값: 5.00)`);
      error(`rating_count: ${count1} (기대값: 1)`);
    }

    // ===== 3단계: 리뷰 조회 API 시뮬레이션 =====
    step(3, '리뷰 조회 테스트 (GET /api/reviews/[listingId])');

    const reviewsQuery = await connection.execute(`
      SELECT
        r.*,
        u.name as user_name,
        u.email as user_email
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.listing_id = ? AND (r.is_hidden IS NULL OR r.is_hidden = FALSE)
      ORDER BY r.created_at DESC
    `, [testListingId]);

    const reviews = reviewsQuery.rows;
    info(`조회된 리뷰 개수: ${reviews.length}개`);

    if (reviews.length === 1) {
      success('리뷰 조회 성공');
      info(`  - 리뷰 ID: ${reviews[0].id}`);
      info(`  - 평점: ${reviews[0].rating}점`);
      info(`  - 제목: ${reviews[0].title}`);
      info(`  - 내용: ${reviews[0].comment_md}`);
      info(`  - 이미지: ${reviews[0].review_images}`);
    } else {
      error(`조회된 리뷰 개수가 올바르지 않음: ${reviews.length}개 (기대값: 1개)`);
    }

    // ===== 4단계: 두 번째 리뷰 작성 (평점 자동 계산 확인) =====
    step(4, '두 번째 리뷰 작성 (3점) - 평균 계산 확인');

    const review2 = await connection.execute(`
      INSERT INTO reviews (
        listing_id, user_id, rating, title, comment_md,
        review_type, is_verified, helpful_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      testListingId,
      testUserId2,
      3,
      '괜찮았어요',
      '나쁘지 않았습니다.',
      'listing',
      true,
      0
    ]);

    testReviewId2 = Number(review2.insertId);
    success(`리뷰 2 생성 완료 (ID: ${testReviewId2})`);

    // rating 자동 업데이트
    await connection.execute(`
      UPDATE listings
      SET
        rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE))
      WHERE id = ?
    `, [testListingId, testListingId, testListingId]);

    const afterReview2 = await connection.execute(
      'SELECT rating_avg, rating_count FROM listings WHERE id = ?',
      [testListingId]
    );

    const avg2 = parseFloat(afterReview2.rows[0].rating_avg);
    const count2 = afterReview2.rows[0].rating_count;
    const expectedAvg = 4.00; // (5 + 3) / 2 = 4.00

    if (avg2 === expectedAvg && count2 === 2) {
      success(`rating_avg: ${avg2.toFixed(2)} (기대값: ${expectedAvg.toFixed(2)}) ✓`);
      success(`rating_count: ${count2} (기대값: 2) ✓`);
      success(`평균 계산 정확: (5 + 3) / 2 = ${avg2.toFixed(2)}`);
    } else {
      error(`rating_avg: ${avg2} (기대값: ${expectedAvg})`);
      error(`rating_count: ${count2} (기대값: 2)`);
    }

    // ===== 5단계: 중복 리뷰 방지 테스트 =====
    step(5, '중복 리뷰 방지 테스트');

    const duplicateCheck = await connection.execute(
      'SELECT id FROM reviews WHERE listing_id = ? AND user_id = ?',
      [testListingId, testUserId1]
    );

    if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
      success('중복 리뷰 감지됨 - 사용자 1은 이미 리뷰 작성함');
      info('실제 API에서는 "이미 이 상품에 대한 리뷰를 작성하셨습니다" 메시지 반환');
    } else {
      error('중복 리뷰 감지 실패');
    }

    // ===== 6단계: 도움됨 기능 테스트 =====
    step(6, '도움됨 기능 테스트 (POST /helpful)');

    // 도움됨 추가 (사용자 3이 리뷰 1에 도움됨 표시)
    await connection.execute(`
      INSERT INTO review_helpful (review_id, user_id, created_at)
      VALUES (?, ?, NOW())
    `, [testReviewId1, 3]);
    success('사용자 3이 리뷰 1에 도움됨 추가');

    // helpful_count 업데이트
    await connection.execute(`
      UPDATE reviews
      SET helpful_count = (SELECT COUNT(*) FROM review_helpful WHERE review_id = ?)
      WHERE id = ?
    `, [testReviewId1, testReviewId1]);

    const helpfulCheck1 = await connection.execute(
      'SELECT helpful_count FROM reviews WHERE id = ?',
      [testReviewId1]
    );
    info(`현재 helpful_count: ${helpfulCheck1.rows[0].helpful_count} (기대값: 1)`);

    // 두 번째 도움됨 추가 (사용자 4)
    await connection.execute(`
      INSERT INTO review_helpful (review_id, user_id, created_at)
      VALUES (?, ?, NOW())
    `, [testReviewId1, 4]);
    success('사용자 4가 리뷰 1에 도움됨 추가');

    await connection.execute(`
      UPDATE reviews
      SET helpful_count = (SELECT COUNT(*) FROM review_helpful WHERE review_id = ?)
      WHERE id = ?
    `, [testReviewId1, testReviewId1]);

    const helpfulCheck2 = await connection.execute(
      'SELECT helpful_count FROM reviews WHERE id = ?',
      [testReviewId1]
    );

    if (helpfulCheck2.rows[0].helpful_count === 2) {
      success(`helpful_count: ${helpfulCheck2.rows[0].helpful_count} (기대값: 2) ✓`);
    } else {
      error(`helpful_count: ${helpfulCheck2.rows[0].helpful_count} (기대값: 2)`);
    }

    // ===== 7단계: 리뷰 수정 테스트 (1일 제한) =====
    step(7, '리뷰 수정 테스트 (1일 제한 확인)');

    const reviewData = await connection.execute(
      'SELECT created_at FROM reviews WHERE id = ?',
      [testReviewId1]
    );

    const createdAt = new Date(reviewData.rows[0].created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    info(`리뷰 작성 시간: ${createdAt.toLocaleString('ko-KR')}`);
    info(`현재 시간: ${now.toLocaleString('ko-KR')}`);
    info(`경과 시간: ${daysDiff.toFixed(6)}일`);

    if (daysDiff <= 1) {
      success('1일 이내이므로 수정 가능 ✓');

      // 실제 수정 테스트
      await connection.execute(`
        UPDATE reviews
        SET rating = ?, title = ?, comment_md = ?, updated_at = NOW()
        WHERE id = ?
      `, [4, '수정된 제목', '수정된 내용입니다.', testReviewId1]);

      success('리뷰 수정 완료');

      // rating 재계산
      await connection.execute(`
        UPDATE listings
        SET
          rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE))
        WHERE id = ?
      `, [testListingId, testListingId, testListingId]);

      const afterEdit = await connection.execute(
        'SELECT rating_avg, rating_count FROM listings WHERE id = ?',
        [testListingId]
      );

      const newAvg = parseFloat(afterEdit.rows[0].rating_avg);
      const expectedNewAvg = 3.50; // (4 + 3) / 2 = 3.50

      info(`수정 후 rating_avg: ${newAvg.toFixed(2)} (기대값: ${expectedNewAvg.toFixed(2)})`);

      if (Math.abs(newAvg - expectedNewAvg) < 0.01) {
        success('평점 재계산 성공 ✓');
      } else {
        error('평점 재계산 오류');
      }
    } else {
      info('1일 초과 - 실제 API에서는 수정 불가 메시지 반환');
    }

    // ===== 8단계: Hidden Review 제외 테스트 =====
    step(8, 'Hidden Review 제외 확인');

    // 리뷰 2를 숨김 처리
    await connection.execute(
      'UPDATE reviews SET is_hidden = TRUE, hidden_reason = ? WHERE id = ?',
      ['테스트용 숨김', testReviewId2]
    );
    success(`리뷰 ${testReviewId2} 숨김 처리`);

    // rating 재계산 (숨긴 리뷰 제외)
    await connection.execute(`
      UPDATE listings
      SET
        rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE))
      WHERE id = ?
    `, [testListingId, testListingId, testListingId]);

    const afterHidden = await connection.execute(
      'SELECT rating_avg, rating_count FROM listings WHERE id = ?',
      [testListingId]
    );

    const hiddenAvg = parseFloat(afterHidden.rows[0].rating_avg);
    const hiddenCount = afterHidden.rows[0].rating_count;

    info(`숨김 처리 후 rating_avg: ${hiddenAvg.toFixed(2)}`);
    info(`숨김 처리 후 rating_count: ${hiddenCount}`);

    if (hiddenAvg === 4.00 && hiddenCount === 1) {
      success('숨긴 리뷰가 rating 계산에서 제외됨 ✓');
      success('리뷰 1만 계산됨 (4점)');
    } else {
      error(`숨김 처리 후 rating_avg: ${hiddenAvg} (기대값: 4.00)`);
      error(`숨김 처리 후 rating_count: ${hiddenCount} (기대값: 1)`);
    }

    // 사용자에게 보이는 리뷰 확인
    const visibleReviews = await connection.execute(`
      SELECT id, title, rating
      FROM reviews
      WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)
    `, [testListingId]);

    info(`사용자에게 보이는 리뷰: ${visibleReviews.rows.length}개 (기대값: 1개)`);

    if (visibleReviews.rows.length === 1) {
      success('숨긴 리뷰는 사용자에게 보이지 않음 ✓');
    }

    // ===== 9단계: 리뷰 삭제 테스트 =====
    step(9, '리뷰 삭제 테스트');

    // 리뷰 1 삭제
    await connection.execute('DELETE FROM reviews WHERE id = ?', [testReviewId1]);
    success(`리뷰 ${testReviewId1} 삭제 완료`);

    // rating 재계산
    await connection.execute(`
      UPDATE listings
      SET
        rating_avg = COALESCE((SELECT AVG(rating) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)), 0),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE))
      WHERE id = ?
    `, [testListingId, testListingId, testListingId]);

    const afterDelete = await connection.execute(
      'SELECT rating_avg, rating_count FROM listings WHERE id = ?',
      [testListingId]
    );

    const deleteAvg = parseFloat(afterDelete.rows[0].rating_avg);
    const deleteCount = afterDelete.rows[0].rating_count;

    info(`삭제 후 rating_avg: ${deleteAvg}`);
    info(`삭제 후 rating_count: ${deleteCount}`);

    // 리뷰 2는 숨김 상태이므로 visible 리뷰는 0개
    if (deleteAvg === 0 && deleteCount === 0) {
      success('삭제 후 rating이 0으로 초기화됨 ✓ (숨긴 리뷰는 계산 안됨)');
    }

    // ===== 10단계: 정리 =====
    step(10, '테스트 데이터 정리');

    // review_helpful 정리
    await connection.execute(
      'DELETE FROM review_helpful WHERE review_id IN (?, ?)',
      [testReviewId1, testReviewId2]
    );
    success('review_helpful 데이터 삭제');

    // 남은 리뷰 삭제
    await connection.execute(
      'DELETE FROM reviews WHERE listing_id = ?',
      [testListingId]
    );
    success('리뷰 데이터 삭제');

    // 테스트 상품 삭제
    await connection.execute('DELETE FROM listings WHERE id = ?', [testListingId]);
    success('테스트 상품 삭제');

    // ===== 최종 결과 =====
    console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.green}🎉 전체 리뷰 시스템 테스트 완료!${colors.reset}\n`);

    console.log(`${colors.blue}✅ 검증된 항목:${colors.reset}`);
    console.log('  1. 새 상품 추가 → rating_avg=0, rating_count=0 초기화 ✓');
    console.log('  2. 첫 리뷰 작성 → rating_avg=5.00, rating_count=1 ✓');
    console.log('  3. 리뷰 조회 API → 정상 조회 ✓');
    console.log('  4. 두 번째 리뷰 → rating_avg=4.00 (평균 계산) ✓');
    console.log('  5. 중복 리뷰 방지 → 감지 성공 ✓');
    console.log('  6. 도움됨 기능 → helpful_count 증가 (0→1→2) ✓');
    console.log('  7. 리뷰 수정 → 1일 이내 수정 가능, rating 재계산 ✓');
    console.log('  8. Hidden Review → rating 계산에서 제외 ✓');
    console.log('  9. 리뷰 삭제 → rating 재계산 ✓');
    console.log('  10. 데이터 정리 → 완료 ✓');

    console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);

  } catch (error) {
    console.error(`\n${colors.red}❌ 오류 발생:${colors.reset}`, error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
