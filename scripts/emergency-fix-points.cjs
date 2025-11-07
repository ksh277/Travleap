const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
require('dotenv').config();

const neonPool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });
const planetscale = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('긴급 포인트 동기화:\n');

    const latestResult = await planetscale.execute(`
      SELECT balance_after, reason, created_at
      FROM user_points
      WHERE user_id = 11
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `);

    if (latestResult.rows && latestResult.rows.length > 0) {
      const correctBalance = latestResult.rows[0].balance_after;

      console.log(`최근 거래 balance_after: ${correctBalance}P`);

      const currentResult = await neonPool.query('SELECT total_points FROM users WHERE id = $1', [11]);
      const currentPoints = currentResult.rows[0]?.total_points || 0;

      console.log(`현재 Neon: ${currentPoints}P`);

      if (currentPoints !== correctBalance) {
        await neonPool.query('UPDATE users SET total_points = $1 WHERE id = $2', [correctBalance, 11]);
        console.log(`수정 완료: ${currentPoints}P → ${correctBalance}P`);
      } else {
        console.log(`이미 동기화됨: ${correctBalance}P`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await neonPool.end();
  }

  process.exit(0);
})();
