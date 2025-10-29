/**
 * 수동 포인트 회수 스크립트
 * 이미 환불된 주문의 포인트를 수동으로 차감합니다.
 *
 * 사용법: node scripts/manual-deduct-points.js
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

// 회수할 포인트 목록
const POINTS_TO_DEDUCT = [
  {
    userId: null, // 사용자 ID는 자동으로 찾습니다
    orderNumber: 'ORDER_1761759049375_9425',
    points: 140
  },
  {
    userId: null,
    orderNumber: 'ORDER_1761757903475_4030',
    points: 150
  }
];

async function deductPoints() {
  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  console.log('🔧 [수동 포인트 회수] 시작...\n');

  try {
    for (const item of POINTS_TO_DEDUCT) {
      console.log(`\n📌 주문번호: ${item.orderNumber}`);

      // 1. user_points 테이블에서 해당 주문의 적립 내역 찾기
      const earnResult = await connection.execute(`
        SELECT user_id, points, id, related_order_id, balance_after
        FROM user_points
        WHERE related_order_id = ? AND point_type = 'earn' AND points > 0
        ORDER BY created_at DESC
        LIMIT 1
      `, [item.orderNumber]);

      if (!earnResult.rows || earnResult.rows.length === 0) {
        console.log(`⚠️  적립 내역을 찾을 수 없습니다. 건너뜁니다.`);
        continue;
      }

      const earnRecord = earnResult.rows[0];
      const userId = earnRecord.user_id;
      const earnedPoints = earnRecord.points;

      console.log(`✅ 적립 내역 발견: user_id=${userId}, ${earnedPoints}P`);

      // 2. 이미 회수되었는지 확인
      const deductCheck = await connection.execute(`
        SELECT id
        FROM user_points
        WHERE user_id = ? AND related_order_id = ? AND point_type = 'refund'
        LIMIT 1
      `, [userId, item.orderNumber]);

      if (deductCheck.rows && deductCheck.rows.length > 0) {
        console.log(`⚠️  이미 회수된 포인트입니다. 건너뜁니다.`);
        continue;
      }

      // 3. Neon PostgreSQL에서 현재 포인트 조회
      const userResult = await poolNeon.query(`
        SELECT total_points FROM users WHERE id = $1
      `, [userId]);

      if (!userResult.rows || userResult.rows.length === 0) {
        console.log(`❌ 사용자를 찾을 수 없습니다 (user_id=${userId}). 건너뜁니다.`);
        continue;
      }

      const currentPoints = userResult.rows[0].total_points || 0;
      const newBalance = Math.max(0, currentPoints - earnedPoints);

      console.log(`💰 현재 포인트: ${currentPoints}P → 회수 후: ${newBalance}P`);

      // 4. 트랜잭션 시작
      await poolNeon.query('BEGIN');

      try {
        // 5. Neon - users 테이블 포인트 차감
        await poolNeon.query(`
          UPDATE users SET total_points = $1 WHERE id = $2
        `, [newBalance, userId]);

        // 6. PlanetScale - user_points 테이블에 회수 내역 추가
        await connection.execute(`
          INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
          VALUES (?, ?, 'refund', ?, ?, ?, NOW())
        `, [
          userId,
          -earnedPoints,
          `환불로 인한 포인트 회수 (주문번호: ${item.orderNumber})`,
          item.orderNumber,
          newBalance
        ]);

        // 7. 커밋
        await poolNeon.query('COMMIT');

        console.log(`✅ 포인트 회수 완료: -${earnedPoints}P (user_id=${userId})`);

      } catch (error) {
        // 롤백
        await poolNeon.query('ROLLBACK');
        console.error(`❌ 트랜잭션 실패:`, error);
        throw error;
      }
    }

    console.log(`\n🎉 모든 포인트 회수 완료!`);

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await poolNeon.end();
    process.exit(0);
  }
}

// 실행
deductPoints();
