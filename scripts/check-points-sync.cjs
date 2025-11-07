const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const planetscale = connect({ url: process.env.DATABASE_URL });
const neonPool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 포인트 동기화 상태 확인:\n');

    // payment_id 66 관련 포인트 확인
    const pointsResult = await planetscale.execute(`
      SELECT user_id, points, point_type, reason, balance_after, created_at
      FROM user_points
      WHERE related_order_id = '66' OR reason LIKE '%payment_id: 66%'
      ORDER BY created_at DESC
    `);

    console.log('📊 PlanetScale user_points (payment_id 66):');
    if (pointsResult.rows && pointsResult.rows.length > 0) {
      pointsResult.rows.forEach(row => {
        console.log(`  User ${row.user_id}: ${row.points > 0 ? '+' : ''}${row.points}P - ${row.reason}`);
        console.log(`    balance_after: ${row.balance_after}P`);
        console.log(`    created_at: ${row.created_at}`);
      });

      const userId = pointsResult.rows[0].user_id;

      console.log('\n📊 Neon users.total_points:');
      const neonResult = await neonPool.query('SELECT id, email, total_points FROM users WHERE id = $1', [userId]);

      if (neonResult.rows && neonResult.rows.length > 0) {
        const user = neonResult.rows[0];
        console.log(`  User ${user.id} (${user.email}): ${user.total_points}P`);

        // PlanetScale에서 총 포인트 계산
        const sumResult = await planetscale.execute('SELECT SUM(points) as total FROM user_points WHERE user_id = ?', [userId]);
        const planetscaleTotal = sumResult.rows[0]?.total || 0;

        console.log(`\n💡 비교:`);
        console.log(`  Neon total_points: ${user.total_points}P`);
        console.log(`  PlanetScale SUM(points): ${planetscaleTotal}P`);
        console.log(`  차이: ${user.total_points - planetscaleTotal}P`);

        if (user.total_points !== planetscaleTotal) {
          console.log(`\n❌ 동기화 안됨! Neon을 ${planetscaleTotal}P로 업데이트 필요`);
        } else {
          console.log(`\n✅ 동기화 정상`);
        }
      }
    } else {
      console.log('  내역 없음');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await neonPool.end();
  }

  process.exit(0);
})();
