/**
 * 긴급 포인트 복구 스크립트
 * 잘못 회수된 1790P를 복구
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function emergencyFixPoints() {
  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  console.log('🚨 긴급 포인트 복구 시작...\n');

  const userId = 11;
  const pointsToRestore = 1790; // 1940P 회수 - 150P (정상 회수) = 1790P 복구

  try {
    await poolNeon.query('BEGIN');

    // 1. 현재 포인트 조회
    const userResult = await poolNeon.query(
      'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    const currentPoints = userResult.rows[0].total_points || 0;
    const newBalance = currentPoints + pointsToRestore;

    console.log(`현재 포인트: ${currentPoints}P`);
    console.log(`복구 포인트: +${pointsToRestore}P`);
    console.log(`최종 잔액: ${newBalance}P\n`);

    // 2. PlanetScale - user_points 기록
    await connection.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
      VALUES (?, ?, 'admin', ?, 'emergency_fix', ?, NOW())
    `, [
      userId,
      pointsToRestore,
      '[긴급 복구] 잘못 회수된 포인트 복구 (1940P 회수 중 1790P 과다 회수)',
      newBalance
    ]);

    console.log('✅ PlanetScale user_points 기록 완료');

    // 3. Neon - users 테이블 업데이트
    await poolNeon.query(
      'UPDATE users SET total_points = $1 WHERE id = $2',
      [newBalance, userId]
    );

    console.log('✅ Neon users 테이블 업데이트 완료');

    await poolNeon.query('COMMIT');
    console.log('✅ 트랜잭션 커밋 완료\n');

    console.log(`🎉 포인트 복구 완료!`);
    console.log(`   복구 전: ${currentPoints}P`);
    console.log(`   복구 후: ${newBalance}P`);

  } catch (error) {
    console.error('\n❌ 복구 실패:', error.message);
    await poolNeon.query('ROLLBACK');
  } finally {
    await poolNeon.end();
  }
}

emergencyFixPoints().catch(console.error);
