/**
 * 하드코딩된 리뷰 데이터 제거 스크립트
 *
 * listings 테이블의 rating_avg와 rating_count를 0으로 초기화
 * 이제부터는 reviews 테이블에서 실시간으로 조회
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function resetHardcodedReviews() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== 하드코딩된 리뷰 데이터 제거 ===\n');

  try {
    // 1. 현재 하드코딩된 리뷰가 있는 상품 확인
    console.log('📊 1. 하드코딩된 리뷰가 있는 상품 확인\n');

    const hardcodedResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        c.name_ko as category,
        l.rating_avg,
        l.rating_count,
        (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = l.id) as actual_review_count
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE (l.rating_count > 0 OR l.rating_avg > 0)
      AND l.is_published = 1
    `);

    console.log(`하드코딩된 리뷰가 있는 상품: ${hardcodedResult.rows.length}개\n`);

    hardcodedResult.rows.forEach(item => {
      console.log(`❌ [ID: ${item.id}] ${item.title}`);
      console.log(`   카테고리: ${item.category}`);
      console.log(`   하드코딩: ${Number(item.rating_avg).toFixed(1)}점 (${item.rating_count}개)`);
      console.log(`   실제: ${item.actual_review_count}개`);
      console.log('');
    });

    if (hardcodedResult.rows.length === 0) {
      console.log('✅ 하드코딩된 리뷰가 없습니다.\n');
      return;
    }

    // 2. 모든 상품의 rating_avg와 rating_count를 0으로 초기화
    console.log('\n🔧 2. 모든 상품의 리뷰 필드 초기화\n');

    const updateResult = await connection.execute(`
      UPDATE listings
      SET rating_avg = 0, rating_count = 0
      WHERE (rating_count > 0 OR rating_avg > 0)
    `);

    console.log(`✅ ${updateResult.rowsAffected || hardcodedResult.rows.length}개 상품의 리뷰 필드가 초기화되었습니다.\n`);

    // 3. 초기화 결과 확인
    console.log('\n📈 3. 초기화 결과 확인\n');

    const verifyResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        l.rating_avg,
        l.rating_count
      FROM listings l
      WHERE l.id IN (${hardcodedResult.rows.map(item => item.id).join(',')})
    `);

    verifyResult.rows.forEach(item => {
      const status = (item.rating_count === 0 && item.rating_avg === 0) ? '✅' : '❌';
      console.log(`${status} [ID: ${item.id}] ${item.title}`);
      console.log(`   rating_avg: ${item.rating_avg}, rating_count: ${item.rating_count}`);
    });

    console.log('\n✅ 하드코딩된 리뷰 제거 완료!');
    console.log('ℹ️  이제부터 리뷰는 reviews 테이블에서 실시간으로 조회됩니다.\n');

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  console.log('=== 완료 ===\n');
}

resetHardcodedReviews();
