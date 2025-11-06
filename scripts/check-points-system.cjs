/**
 * 포인트 시스템 전체 점검 스크립트
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkPointsSystem() {
  const planetscale = connect({ url: process.env.DATABASE_URL });
  const neonPool = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    console.log('🔍 포인트 시스템 전체 점검 시작...\n');

    // 1. Neon PostgreSQL users 테이블 - total_points 컬럼 확인
    console.log('📋 [Neon] users 테이블 - total_points 컬럼:');
    const neonUsersResult = await neonPool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'total_points'
    `);

    if (neonUsersResult.rows.length > 0) {
      console.log('  ✅ total_points 컬럼 존재:', neonUsersResult.rows[0]);

      // 샘플 사용자 포인트 조회
      const sampleUsersResult = await neonPool.query(`
        SELECT id, email, total_points
        FROM users
        WHERE total_points > 0
        LIMIT 5
      `);

      console.log('  📊 포인트 보유 사용자 샘플:');
      sampleUsersResult.rows.forEach(user => {
        console.log(`    User ID ${user.id}: ${user.email} - ${user.total_points}P`);
      });
    } else {
      console.log('  ❌ total_points 컬럼 없음!');
    }

    console.log('');

    // 2. PlanetScale user_points 테이블 확인
    console.log('📋 [PlanetScale] user_points 테이블 구조:');
    const pointsSchemaResult = await planetscale.execute('DESCRIBE user_points');
    pointsSchemaResult.rows.forEach(row => {
      console.log(`  - ${row.Field} (${row.Type}) ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('');

    // 3. 포인트 내역 샘플 조회
    console.log('📊 [PlanetScale] user_points 내역 샘플:');
    const pointsHistoryResult = await planetscale.execute(`
      SELECT user_id, points, point_type, reason, balance_after, created_at
      FROM user_points
      ORDER BY created_at DESC
      LIMIT 10
    `);

    pointsHistoryResult.rows.forEach(row => {
      const typeEmoji = row.point_type === 'earn' ? '💰' : row.point_type === 'use' ? '💸' : '🔙';
      console.log(`  ${typeEmoji} User ${row.user_id}: ${row.points > 0 ? '+' : ''}${row.points}P - ${row.reason} (잔액: ${row.balance_after}P)`);
    });

    console.log('');

    // 4. 포인트 타입별 통계
    console.log('📊 포인트 타입별 통계:');
    const statsResult = await planetscale.execute(`
      SELECT
        point_type,
        COUNT(*) as count,
        SUM(points) as total_points,
        AVG(points) as avg_points
      FROM user_points
      GROUP BY point_type
    `);

    statsResult.rows.forEach(row => {
      console.log(`  ${row.point_type}: ${row.count}건, 총 ${row.total_points}P, 평균 ${Math.round(row.avg_points)}P`);
    });

    console.log('');

    // 5. Dual Database 동기화 확인
    console.log('🔄 Dual Database 동기화 확인:');
    const userIdsResult = await neonPool.query(`
      SELECT id, email, total_points
      FROM users
      WHERE total_points IS NOT NULL
      LIMIT 5
    `);

    for (const user of userIdsResult.rows) {
      // PlanetScale에서 해당 사용자의 포인트 내역 조회
      const planetscalePointsResult = await planetscale.execute(`
        SELECT SUM(points) as total_from_history
        FROM user_points
        WHERE user_id = ?
      `, [user.id]);

      const neonTotal = user.total_points || 0;
      const planetscaleTotal = planetscalePointsResult.rows[0]?.total_from_history || 0;
      const match = neonTotal === planetscaleTotal ? '✅' : '❌';

      console.log(`  ${match} User ${user.id} (${user.email}):`);
      console.log(`    Neon total_points: ${neonTotal}P`);
      console.log(`    PlanetScale history sum: ${planetscaleTotal}P`);

      if (neonTotal !== planetscaleTotal) {
        console.log(`    ⚠️  불일치! 차이: ${neonTotal - planetscaleTotal}P`);
      }
    }

    console.log('');

    // 6. 만료된 포인트 확인
    console.log('⏰ 만료된 포인트 확인:');
    const expiredPointsResult = await planetscale.execute(`
      SELECT COUNT(*) as count, SUM(points) as total_expired
      FROM user_points
      WHERE expires_at < NOW() AND point_type = 'earn'
    `);

    const expiredData = expiredPointsResult.rows[0];
    console.log(`  만료된 포인트: ${expiredData.count}건, 총 ${expiredData.total_expired || 0}P`);

    console.log('');

    // 7. 최근 포인트 적립 확인
    console.log('💰 최근 포인트 적립 (earn):');
    const recentEarnResult = await planetscale.execute(`
      SELECT user_id, points, reason, balance_after, created_at
      FROM user_points
      WHERE point_type = 'earn'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    recentEarnResult.rows.forEach(row => {
      console.log(`  User ${row.user_id}: +${row.points}P - ${row.reason}`);
      console.log(`    잔액: ${row.balance_after}P, 일시: ${row.created_at}`);
    });

    console.log('');

    // 8. 최근 포인트 사용 확인
    console.log('💸 최근 포인트 사용 (use):');
    const recentUseResult = await planetscale.execute(`
      SELECT user_id, points, reason, balance_after, created_at
      FROM user_points
      WHERE point_type = 'use'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (recentUseResult.rows.length > 0) {
      recentUseResult.rows.forEach(row => {
        console.log(`  User ${row.user_id}: ${row.points}P - ${row.reason}`);
        console.log(`    잔액: ${row.balance_after}P, 일시: ${row.created_at}`);
      });
    } else {
      console.log('  포인트 사용 내역 없음');
    }

    console.log('\n✅ 포인트 시스템 점검 완료\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await neonPool.end();
  }

  process.exit(0);
}

checkPointsSystem();
