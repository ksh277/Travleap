const { connect } = require('@planetscale/database');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const sql = neon(process.env.POSTGRES_DATABASE_URL);

    // 김승환 계정의 user_id 확인
    const users = await sql`SELECT id, email, name FROM users WHERE name = '김승환'`;
    console.log('김승환 사용자:', users);

    if (users.length > 0) {
      const userId = users[0].id;
      console.log('\nUser ID:', userId);

      // reviews 테이블 확인
      const reviews = await connection.execute(
        'SELECT id, user_id, listing_id, rating, comment_md, title, created_at FROM reviews WHERE user_id = ? LIMIT 5',
        [userId]
      );
      console.log('\n상품 리뷰 개수:', reviews.rows?.length || 0);
      if (reviews.rows && reviews.rows.length > 0) {
        console.log('상품 리뷰:', reviews.rows);
      } else {
        console.log('상품 리뷰: 없음');
      }

      // blog_comments 확인
      const comments = await connection.execute(
        'SELECT id, user_id, blog_id, content, created_at FROM blog_comments WHERE user_id = ? LIMIT 5',
        [userId]
      );
      console.log('\n블로그 댓글 개수:', comments.rows?.length || 0);
      if (comments.rows && comments.rows.length > 0) {
        console.log('블로그 댓글:', comments.rows);
      } else {
        console.log('블로그 댓글: 없음');
      }
    }
  } catch (error) {
    console.error('에러:', error);
  }
}

check();
