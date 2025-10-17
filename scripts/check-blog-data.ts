/**
 * 블로그 데이터 확인 스크립트
 */

import { config } from 'dotenv';
import { connect } from '@planetscale/database';

config();

async function checkBlogData() {
  console.log('🔍 Checking blog data in database...\n');

  const conn = connect({ url: process.env.DATABASE_URL! });

  try {
    // 모든 블로그 포스트 조회
    const result = await conn.execute(`
      SELECT id, title, author_id, category, is_published, created_at
      FROM blog_posts
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`📊 Found ${result.rows.length} blog posts:\n`);

    if (result.rows.length === 0) {
      console.log('❌ No blog posts found in database!');
      console.log('   Run: npx tsx scripts/run-seed-blog.ts');
    } else {
      result.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. ${row.title}`);
        console.log(`   - ID: ${row.id}`);
        console.log(`   - Author ID: ${row.author_id}`);
        console.log(`   - Category: ${row.category}`);
        console.log(`   - Published: ${row.is_published ? 'Yes' : 'No'}`);
        console.log(`   - Created: ${row.created_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error checking blog data:', error);
  }
}

checkBlogData();
