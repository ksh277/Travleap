/**
 * 포인트 만료 자동 처리 Cron Job
 *
 * 실행 주기: 매일 자정 (00:00)
 * 기능:
 * - 만료된 포인트 찾기 (expires_at < NOW())
 * - 사용자별로 만료 포인트 합계 계산
 * - Neon: users.total_points 차감
 * - PlanetScale: user_points에 'expire' 타입 레코드 추가
 *
 * Vercel Cron 설정:
 * vercel.json에 추가:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-points",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function expirePoints() {
  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  let processedCount = 0;
  let totalExpiredPoints = 0;
  const errors = [];

  try {
    console.log('⏰ [포인트 만료] 자동 처리 시작:', new Date().toISOString());
    console.log('─'.repeat(60));

    // 1. 만료된 포인트 조회 (사용자별 합계)
    const expiredResult = await connection.execute(`
      SELECT
        user_id,
        COUNT(*) as expired_count,
        SUM(points) as total_expired_points,
        GROUP_CONCAT(id ORDER BY created_at) as point_ids
      FROM user_points
      WHERE point_type = 'earn'
        AND points > 0
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
      GROUP BY user_id
      HAVING total_expired_points > 0
    `);

    const expiredUsers = expiredResult.rows || [];

    if (expiredUsers.length === 0) {
      console.log('✅ 만료된 포인트가 없습니다.');
      return {
        success: true,
        message: '만료된 포인트 없음',
        processedCount: 0,
        totalExpiredPoints: 0
      };
    }

    console.log(`📊 총 ${expiredUsers.length}명의 사용자에게 만료된 포인트 발견\n`);

    // 2. 사용자별로 포인트 만료 처리
    for (const user of expiredUsers) {
      const { user_id, expired_count, total_expired_points } = user;

      try {
        console.log(`\n👤 User ${user_id}: ${expired_count}건, ${total_expired_points}P 만료 처리 중...`);

        // 2-1. Neon PostgreSQL 트랜잭션 시작
        await poolNeon.query('BEGIN');

        // 2-2. 현재 포인트 조회 (FOR UPDATE로 락)
        const userResult = await poolNeon.query(`
          SELECT total_points FROM users WHERE id = $1 FOR UPDATE
        `, [user_id]);

        if (!userResult.rows || userResult.rows.length === 0) {
          console.warn(`⚠️  User ${user_id}: 사용자를 찾을 수 없음 (스킵)`);
          await poolNeon.query('ROLLBACK');
          errors.push({ user_id, error: '사용자 없음' });
          continue;
        }

        const currentPoints = userResult.rows[0].total_points || 0;
        const newBalance = currentPoints - total_expired_points;

        console.log(`   현재 포인트: ${currentPoints}P → 만료 후: ${newBalance}P`);

        // 2-3. Neon: users.total_points 차감
        await poolNeon.query(`
          UPDATE users SET total_points = $1 WHERE id = $2
        `, [newBalance, user_id]);

        // 2-4. Neon 커밋
        await poolNeon.query('COMMIT');
        console.log(`   ✅ Neon 업데이트 완료`);

        // 2-5. PlanetScale: user_points에 만료 기록 추가
        await connection.execute(`
          INSERT INTO user_points (
            user_id,
            points,
            point_type,
            reason,
            balance_after,
            created_at
          ) VALUES (?, ?, 'expire', ?, ?, NOW())
        `, [
          user_id,
          -total_expired_points,
          `포인트 자동 만료 (${expired_count}건)`,
          newBalance
        ]);

        console.log(`   ✅ PlanetScale 만료 기록 추가 완료`);

        processedCount++;
        totalExpiredPoints += total_expired_points;

      } catch (userError) {
        console.error(`❌ User ${user_id} 처리 실패:`, userError.message);

        // 롤백 시도
        try {
          await poolNeon.query('ROLLBACK');
        } catch (rollbackError) {
          console.error(`   롤백 실패:`, rollbackError.message);
        }

        errors.push({ user_id, error: userError.message });
      }
    }

    // 3. 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 처리 완료 요약:');
    console.log(`   - 처리 성공: ${processedCount}명`);
    console.log(`   - 처리 실패: ${errors.length}명`);
    console.log(`   - 총 만료 포인트: ${totalExpiredPoints}P`);

    if (errors.length > 0) {
      console.log('\n⚠️  실패 목록:');
      errors.forEach(({ user_id, error }) => {
        console.log(`   - User ${user_id}: ${error}`);
      });
    }

    // 4. 관리자 알림 생성 (실패 케이스가 있을 경우)
    if (errors.length > 0) {
      try {
        await connection.execute(`
          INSERT INTO admin_notifications (
            type, priority, title, message, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, NOW())
        `, [
          'POINT_EXPIRY_PARTIAL_FAILURE',
          'MEDIUM',
          '⚠️ 포인트 만료 처리 일부 실패',
          `${processedCount}명 성공, ${errors.length}명 실패`,
          JSON.stringify({
            processedCount,
            failedCount: errors.length,
            totalExpiredPoints,
            errors: errors.slice(0, 10), // 최대 10개만 저장
            timestamp: new Date().toISOString()
          })
        ]);
        console.log('\n📢 관리자 알림 생성 완료');
      } catch (notifError) {
        console.error('❌ 관리자 알림 생성 실패:', notifError.message);
      }
    }

    console.log('='.repeat(60));
    console.log('✅ 포인트 만료 처리 완료:', new Date().toISOString());

    return {
      success: true,
      processedCount,
      failedCount: errors.length,
      totalExpiredPoints,
      errors
    };

  } catch (error) {
    console.error('❌ [포인트 만료] 전체 프로세스 실패:', error);

    // 크리티컬 에러 알림
    try {
      await connection.execute(`
        INSERT INTO admin_notifications (
          type, priority, title, message, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        'POINT_EXPIRY_CRITICAL_FAILURE',
        'CRITICAL',
        '🚨 포인트 만료 처리 전체 실패',
        error.message,
        JSON.stringify({
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        })
      ]);
    } catch (notifError) {
      console.error('❌ 크리티컬 알림 생성 실패:', notifError.message);
    }

    return {
      success: false,
      error: error.message,
      processedCount,
      totalExpiredPoints
    };

  } finally {
    // Connection pool 정리
    await poolNeon.end();
  }
}

// 직접 실행 시
if (require.main === module) {
  expirePoints()
    .then(result => {
      console.log('\n최종 결과:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('실행 실패:', error);
      process.exit(1);
    });
}

// API에서 사용할 수 있도록 export
module.exports = { expirePoints };
