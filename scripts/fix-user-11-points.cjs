const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
require('dotenv').config();

const neonPool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });
const planetscale = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔧 User 11 포인트 동기화 수정:\n');

    // 1. 최근 포인트 내역에서 올바른 잔액 확인
    const latestResult = await planetscale.execute(`
      SELECT balance_after, created_at, reason
      FROM user_points
      WHERE user_id = 11
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (latestResult.rows && latestResult.rows.length > 0) {
      const correctBalance = latestResult.rows[0].balance_after;
      console.log(`최근 거래의 balance_after: ${correctBalance}P`);
      console.log(`  이유: ${latestResult.rows[0].reason}`);
      console.log(`  시간: ${latestResult.rows[0].created_at}`);

      // 2. Neon 현재 값 확인
      const currentResult = await neonPool.query('SELECT total_points FROM users WHERE id = $1', [11]);
      const currentPoints = currentResult.rows[0]?.total_points || 0;

      console.log(`\nNeon 현재 값: ${currentPoints}P`);
      console.log(`수정할 값: ${correctBalance}P`);

      // 3. 업데이트
      await neonPool.query('UPDATE users SET total_points = $1 WHERE id = $2', [correctBalance, 11]);

      console.log(`\n✅ User 11의 total_points를 ${currentPoints}P → ${correctBalance}P로 수정 완료!`);

      // 4. 확인
      const verifyResult = await neonPool.query('SELECT id, email, total_points FROM users WHERE id = $1', [11]);
      console.log(`\n확인: User ${verifyResult.rows[0].id} (${verifyResult.rows[0].email}): ${verifyResult.rows[0].total_points}P`);

    } else {
      console.log('포인트 내역이 없습니다.');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await neonPool.end();
  }

  process.exit(0);
})();
