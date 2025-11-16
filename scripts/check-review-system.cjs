/**
 * 리뷰 시스템 현황 점검 스크립트
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkReviewSystem() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== 리뷰 시스템 점검 ===\n');

  try {
    // 1. listings 테이블의 리뷰 필드 확인
    console.log('📊 1. listings 테이블 리뷰 필드\n');

    const listingsResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        c.name_ko as category,
        c.slug as category_slug,
        l.rating_avg,
        l.rating_count,
        (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = l.id) as actual_review_count,
        (SELECT AVG(r.rating) FROM reviews r WHERE r.listing_id = l.id) as actual_rating_avg
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.is_published = 1
      ORDER BY l.created_at DESC
      LIMIT 20
    `);

    console.log(`총 ${listingsResult.rows.length}개 상품:\n`);

    let mismatchCount = 0;

    listingsResult.rows.forEach(item => {
      const storedCount = Number(item.rating_count) || 0;
      const actualCount = Number(item.actual_review_count) || 0;
      const storedAvg = Number(item.rating_avg) || 0;
      const actualAvg = Number(item.actual_rating_avg) || 0;

      const countMismatch = storedCount !== actualCount;
      const avgMismatch = Math.abs(storedAvg - actualAvg) > 0.1;

      if (countMismatch || avgMismatch) {
        mismatchCount++;
        console.log(`❌ [ID: ${item.id}] ${item.title}`);
        console.log(`   카테고리: ${item.category} (${item.category_slug})`);
        console.log(`   저장된 리뷰: ${storedAvg.toFixed(1)}점 (${storedCount}개)`);
        console.log(`   실제 리뷰: ${actualAvg ? actualAvg.toFixed(1) : 'N/A'}점 (${actualCount}개)`);
        console.log('');
      } else {
        console.log(`✅ [ID: ${item.id}] ${item.title}`);
        console.log(`   카테고리: ${item.category} (${item.category_slug})`);
        console.log(`   리뷰: ${storedAvg.toFixed(1)}점 (${storedCount}개) - 일치`);
      }
    });

    console.log(`\n불일치 상품: ${mismatchCount}개\n`);

    // 2. reviews 테이블 구조 확인
    console.log('\n📝 2. reviews 테이블 구조\n');

    const reviewsSchema = await connection.execute(`
      DESCRIBE reviews
    `);

    console.log('reviews 테이블 필드:');
    reviewsSchema.rows.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 3. 실제 리뷰 데이터 샘플
    console.log('\n\n💬 3. 실제 리뷰 데이터 샘플\n');

    const reviewsSample = await connection.execute(`
      SELECT
        r.id,
        r.listing_id,
        l.title as listing_title,
        r.user_id,
        r.rating,
        r.comment_md,
        r.created_at
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);

    console.log(`총 리뷰 수: ${reviewsSample.rows.length}개\n`);

    reviewsSample.rows.forEach(review => {
      console.log(`리뷰 ID: ${review.id}`);
      console.log(`  상품: [${review.listing_id}] ${review.listing_title || 'N/A'}`);
      console.log(`  평점: ${review.rating}점`);
      console.log(`  내용: ${review.comment_md ? review.comment_md.substring(0, 50) + '...' : 'N/A'}`);
      console.log(`  작성일: ${review.created_at}`);
      console.log('');
    });

    // 4. 카테고리별 리뷰 통계
    console.log('\n📈 4. 카테고리별 리뷰 통계\n');

    const categoryStats = await connection.execute(`
      SELECT
        c.name_ko as category,
        c.slug,
        COUNT(DISTINCT l.id) as product_count,
        SUM(l.rating_count) as stored_review_count,
        (SELECT COUNT(*) FROM reviews r
         INNER JOIN listings ll ON r.listing_id = ll.id
         WHERE ll.category_id = c.id) as actual_review_count
      FROM categories c
      LEFT JOIN listings l ON l.category_id = c.id AND l.is_published = 1
      GROUP BY c.id, c.name_ko, c.slug
      ORDER BY c.id
    `);

    categoryStats.rows.forEach(stat => {
      const stored = stat.stored_review_count || 0;
      const actual = stat.actual_review_count || 0;
      const status = stored === actual ? '✅' : '❌';

      console.log(`${status} ${stat.category} (${stat.slug})`);
      console.log(`   상품 수: ${stat.product_count}개`);
      console.log(`   저장된 리뷰: ${stored}개`);
      console.log(`   실제 리뷰: ${actual}개`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  console.log('=== 점검 완료 ===\n');
}

checkReviewSystem();
