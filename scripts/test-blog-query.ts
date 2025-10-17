import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function testBlogQuery() {
  const conn = connect({ url: process.env.DATABASE_URL! });

  console.log('🔍 Testing blog query...\n');

  try {
    const sql = `
      SELECT
        bp.id, bp.title, bp.slug, bp.author_id, bp.excerpt,
        bp.featured_image, bp.image_url, bp.category, bp.tags,
        bp.views, bp.likes, bp.comments_count,
        bp.published_at, bp.created_at,
        u.name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.is_published = 1
      ORDER BY bp.published_at DESC, bp.created_at DESC
      LIMIT 5
    `;

    console.log('SQL:', sql.trim());
    console.log('\n');

    const result = await conn.execute(sql);

    console.log(`✅ Found ${result.rows.length} blog posts:\n`);

    result.rows.forEach((blog: any) => {
      console.log(`- ${blog.title}`);
      console.log(`  ID: ${blog.id}, Author: ${blog.author_name}, Category: ${blog.category}`);
      console.log(`  Views: ${blog.views}, Likes: ${blog.likes}`);
      console.log('');
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

testBlogQuery().catch(console.error);
