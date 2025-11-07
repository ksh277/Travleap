const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await connection.execute(`
      SELECT id, points, point_type, reason, balance_after, created_at
      FROM user_points
      WHERE user_id = 11
      ORDER BY created_at DESC
    `);

    console.log('User 11의 포인트 내역:\n');

    let sum = 0;
    result.rows.forEach(row => {
      sum += row.points;
      const sign = row.points > 0 ? '+' : '';
      console.log(`[${row.id}] ${row.point_type}: ${sign}${row.points}P (잔액 기록: ${row.balance_after}P)`);
      console.log(`    ${row.reason}`);
      console.log(`    실제 누적: ${sum}P, 생성: ${row.created_at}`);
      console.log('');
    });

    console.log(`=`.repeat(70));
    console.log(`최종 총합: ${sum}P`);
    console.log(`=`.repeat(70));

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
})();
