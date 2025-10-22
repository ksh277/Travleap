import 'dotenv/config';
import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL });

async function checkReviews() {
  console.log('📊 최근 리뷰 확인 (카테고리 정보 포함)\n');

  const reviews = await connection.execute(`
    SELECT r.id, r.listing_id, r.rating, r.title, r.review_type,
           l.title as listing_title, l.category
    FROM reviews r
    LEFT JOIN listings l ON r.listing_id = l.id
    ORDER BY r.created_at DESC
    LIMIT 5
  `);

  if (reviews.rows.length === 0) {
    console.log('❌ 리뷰가 없습니다.');
    return;
  }

  console.log(`✅ 최근 리뷰 ${reviews.rows.length}개:\n`);
  reviews.rows.forEach((r: any, index: number) => {
    console.log(`${index + 1}. [ID: ${r.id}] ${r.title} (${r.rating}점)`);
    console.log(`   상품: ${r.listing_title}`);
    console.log(`   타입: ${r.review_type}, 카테고리: ${r.category}`);
    console.log('');
  });
}

checkReviews().catch(console.error);
