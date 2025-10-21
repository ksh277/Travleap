import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function checkReviews() {
  const conn = connect(config);

  const result = await conn.execute(`
    SELECT r.*, l.title, u.name
    FROM reviews r
    LEFT JOIN listings l ON r.listing_id = l.id
    LEFT JOIN users u ON r.user_id = u.id
    ORDER BY r.created_at DESC
  `);

  console.log('📋 전체 리뷰:');
  result.rows.forEach((row: any) => {
    console.log(`  - [${row.rating}/5] ${row.title || row.comment_md?.substring(0, 30)} (상품 ID: ${row.listing_id})`);
    console.log(`    작성자: ${row.name}, 상품: ${row.title}`);
  });

  process.exit(0);
}

checkReviews();
