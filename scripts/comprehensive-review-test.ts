import 'dotenv/config';
import { connect } from '@planetscale/database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connection = connect({ url: process.env.DATABASE_URL });

console.log('🔍 리뷰 시스템 종합 검사 시작\n');

async function main() {
  try {
    // 1. API 엔드포인트 체크
    console.log('📋 1. API 엔드포인트 파일 존재 확인');

    const apiFiles = [
      'api/reviews/[listingId].js',
      'api/reviews/edit/[reviewId].js',
      'api/admin/reviews/[reviewId].js',
      'api/admin/reviews.js',
      'api/reviews/helpful/[reviewId].js',
      'api/reviews/report.js'
    ];

    apiFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      const exists = fs.existsSync(filePath);
      console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    });

    // 2. 데이터베이스 테이블 확인
    console.log('\n📋 2. 데이터베이스 테이블 확인');
    const tables = ['reviews', 'review_helpful', 'review_reports', 'listings'];

    for (const table of tables) {
      const result = await connection.execute(`SHOW TABLES LIKE ?`, [table]);
      const exists = result.rows && result.rows.length > 0;
      console.log(`  ${exists ? '✅' : '❌'} ${table} 테이블`);
    }

    // 3. reviews 테이블 스키마 확인
    console.log('\n📋 3. reviews 테이블 주요 컬럼 확인');
    const reviewsSchema = await connection.execute(`DESCRIBE reviews`);
    const requiredColumns = [
      'id', 'listing_id', 'user_id', 'rating', 'title', 'comment_md',
      'review_images', 'is_hidden', 'helpful_count', 'created_at'
    ];

    requiredColumns.forEach(col => {
      const exists = reviewsSchema.rows.some((row: any) => row.Field === col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    // 4. listings 테이블 rating 컬럼 확인
    console.log('\n📋 4. listings 테이블 rating 컬럼 확인');
    const listingsSchema = await connection.execute(`DESCRIBE listings`);
    const ratingColumns = ['rating_avg', 'rating_count', 'category'];

    ratingColumns.forEach(col => {
      const columnInfo: any = listingsSchema.rows.find((row: any) => row.Field === col);
      if (columnInfo) {
        console.log(`  ✅ ${col} (${columnInfo.Type}, Default: ${columnInfo.Default})`);
      } else {
        console.log(`  ❌ ${col} 없음`);
      }
    });

    // 5. 실제 리뷰 데이터 확인
    console.log('\n📋 5. 실제 리뷰 데이터 확인');
    const reviewCount = await connection.execute(`SELECT COUNT(*) as count FROM reviews`);
    console.log(`  총 리뷰 개수: ${reviewCount.rows[0].count}개`);

    const recentReviews = await connection.execute(`
      SELECT r.id, r.listing_id, r.rating, r.title, r.is_hidden,
             l.title as listing_title, l.rating_avg, l.rating_count, l.category
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      ORDER BY r.created_at DESC
      LIMIT 3
    `);

    if (recentReviews.rows.length > 0) {
      console.log('\n  최근 리뷰 3개:');
      recentReviews.rows.forEach((r: any, idx: number) => {
        console.log(`  ${idx + 1}. [ID: ${r.id}] ${r.title}`);
        console.log(`     상품: ${r.listing_title} (카테고리: ${r.category})`);
        console.log(`     평점: ${r.rating}/5, 숨김: ${r.is_hidden ? 'YES' : 'NO'}`);
        console.log(`     상품 rating_avg: ${r.rating_avg}, rating_count: ${r.rating_count}`);
      });
    }

    // 6. Hidden review 로직 검증
    console.log('\n📋 6. Hidden review 처리 확인');
    const hiddenReviews = await connection.execute(`
      SELECT COUNT(*) as count FROM reviews WHERE is_hidden = TRUE
    `);
    console.log(`  숨김 처리된 리뷰: ${hiddenReviews.rows[0].count}개`);

    // 7. 도움됨 기능 확인
    console.log('\n📋 7. 도움됨 기능 데이터 확인');
    const helpfulCount = await connection.execute(`SELECT COUNT(*) as count FROM review_helpful`);
    console.log(`  총 도움됨 개수: ${helpfulCount.rows[0].count}개`);

    // 8. 신고 기능 확인
    console.log('\n📋 8. 신고 기능 데이터 확인');
    const reportCount = await connection.execute(`SELECT COUNT(*) as count FROM review_reports`);
    console.log(`  총 신고 개수: ${reportCount.rows[0].count}개`);

    // 9. Rating 계산 정확도 검증
    console.log('\n📋 9. Rating 계산 정확도 검증');
    const listingsWithReviews = await connection.execute(`
      SELECT l.id, l.title, l.rating_avg, l.rating_count,
             (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id AND (is_hidden IS NULL OR is_hidden = FALSE)) as actual_count,
             (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = l.id AND (is_hidden IS NULL OR is_hidden = FALSE)) as actual_avg
      FROM listings l
      WHERE l.rating_count > 0
      LIMIT 5
    `);

    if (listingsWithReviews.rows.length > 0) {
      console.log('\n  리뷰가 있는 상품 (최대 5개):');
      let allCorrect = true;
      listingsWithReviews.rows.forEach((l: any) => {
        const countMatch = Number(l.rating_count) === Number(l.actual_count);
        const avgMatch = Math.abs(parseFloat(l.rating_avg) - parseFloat(l.actual_avg)) < 0.01;
        const status = (countMatch && avgMatch) ? '✅' : '❌';

        if (!countMatch || !avgMatch) allCorrect = false;

        console.log(`  ${status} [${l.id}] ${l.title}`);
        console.log(`     DB: count=${l.rating_count}, avg=${parseFloat(l.rating_avg).toFixed(2)}`);
        console.log(`     실제: count=${l.actual_count}, avg=${parseFloat(l.actual_avg).toFixed(2)}`);
      });

      if (allCorrect) {
        console.log('\n  ✅ 모든 rating 계산이 정확합니다!');
      } else {
        console.log('\n  ❌ 일부 rating 계산이 부정확합니다. 재계산이 필요합니다.');
      }
    } else {
      console.log('  ℹ️  리뷰가 있는 상품이 없습니다.');
    }

    // 10. 최종 결과
    console.log('\n' + '='.repeat(80));
    console.log('🎉 리뷰 시스템 종합 검사 완료!\n');

    console.log('📊 요약:');
    console.log(`  - API 엔드포인트: ${apiFiles.length}개`);
    console.log(`  - 데이터베이스 테이블: ${tables.length}개`);
    console.log(`  - 총 리뷰: ${reviewCount.rows[0].count}개`);
    console.log(`  - 숨김 리뷰: ${hiddenReviews.rows[0].count}개`);
    console.log(`  - 도움됨: ${helpfulCount.rows[0].count}개`);
    console.log(`  - 신고: ${reportCount.rows[0].count}개`);

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
