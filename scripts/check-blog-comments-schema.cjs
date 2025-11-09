const { connect } = require('@planetscale/database');
require('dotenv').config();

async function check() {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const result = await connection.execute('DESCRIBE blog_comments');
    console.log('blog_comments 테이블 구조:');
    console.table(result.rows);
  } catch (error) {
    console.error('에러:', error.message);
  }
}

check();
