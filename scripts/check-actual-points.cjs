const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await connection.execute(`
      SELECT id, points, point_type, reason, balance_after, created_at
      FROM user_points
      WHERE user_id = 11 AND id IN (20, 21, 22)
      ORDER BY created_at ASC
    `);

    console.log('ID 20, 21, 22 시간순:\n');

    result.rows.forEach(row => {
      const sign = row.points > 0 ? '+' : '';
      console.log(`[${row.id}] ${row.point_type}: ${sign}${row.points}P`);
      console.log(`  balance_after: ${row.balance_after}P`);
      console.log(`  created_at: ${row.created_at}`);
      console.log(`  reason: ${row.reason}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
})();
