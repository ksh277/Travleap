/**
 * 긴급 포인트 복구 롤백
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function rollbackEmergencyFix() {
  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  console.log('🔄 긴급 복구 롤백 시작...\n');

  const userId = 11;
  const pointsToDeduct = 1790; // 잘못 복구한 1790P 제거

  try {
    await poolNeon.query('BEGIN');

    // 1. 현재 포인트 조회
    const userResult = await poolNeon.query(
      'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    const currentPoints = userResult.rows[0].total_points || 0;
    const newBalance = Math.max(0, currentPoints - pointsToDeduct);

    console.log(`현재 포인트: ${currentPoints}P`);
    console.log(`차감 포인트: -${pointsToDeduct}P`);
    console.log(`최종 잔액: ${newBalance}P\n`);

    // 2. PlanetScale - user_points 기록
    await connection.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
      VALUES (?, ?, 'admin', ?, 'rollback', ?, NOW())
    `, [
      userId,
      -pointsToDeduct,
      '[롤백] 잘못 복구된 포인트 제거 (전부 환불되어 0P가 맞음)',
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

    console.log(`🎉 롤백 완료!`);
    console.log(`   롤백 전: ${currentPoints}P`);
    console.log(`   롤백 후: ${newBalance}P`);

  } catch (error) {
    console.error('\n❌ 롤백 실패:', error.message);
    await poolNeon.query('ROLLBACK');
  } finally {
    await poolNeon.end();
  }
}

rollbackEmergencyFix().catch(console.error);
