/**
 * 수동 포인트 회수 스크립트
 * 이미 환불된 주문의 포인트를 수동으로 차감합니다.
 *
 * 사용법: node scripts/manual-deduct-points.js
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

// 🔧 회수할 포인트 목록
// 주의: 장바구니 주문은 여러 payment가 있으므로 각 payment_id마다 적립 내역이 있습니다
// related_order_id는 payment.id 형식으로 저장되어 있습니다
const POINTS_TO_DEDUCT = [
  {
    userId: null, // 사용자 ID는 자동으로 찾습니다
    orderNumber: 'ORDER_1761922261162_7787',  // 420P 회수 대상
    isCartOrder: true  // 장바구니 주문 여부
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

      let userId = null;
      let totalEarnedPoints = 0;
      const paymentIds = [];

      // 🔧 장바구니 주문인 경우: 모든 카테고리 payments 조회
      if (item.isCartOrder) {
        console.log(`🛒 장바구니 주문 처리 중...`);

        // 1. 해당 주문의 모든 payments 조회
        const paymentsResult = await connection.execute(`
          SELECT id, user_id, amount, notes
          FROM payments
          WHERE gateway_transaction_id = ?
          ORDER BY id ASC
        `, [item.orderNumber]);

        if (!paymentsResult.rows || paymentsResult.rows.length === 0) {
          console.log(`⚠️  주문을 찾을 수 없습니다. 건너뜁니다.`);
          continue;
        }

        const allPayments = paymentsResult.rows;
        userId = allPayments[0].user_id;

        console.log(`✅ ${allPayments.length}개 카테고리 payments 발견 (user_id=${userId})`);

        // 2. 각 payment마다 적립 내역 조회
        for (const payment of allPayments) {
          const paymentId = String(payment.id);

          const earnResult = await connection.execute(`
            SELECT points, id
            FROM user_points
            WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn' AND points > 0
            ORDER BY created_at DESC
            LIMIT 1
          `, [userId, paymentId]);

          if (earnResult.rows && earnResult.rows.length > 0) {
            const points = earnResult.rows[0].points;
            totalEarnedPoints += points;
            paymentIds.push(paymentId);
            console.log(`   payment_id=${payment.id}: ${points}P 적립`);
          } else {
            console.log(`   payment_id=${payment.id}: 적립 내역 없음`);
          }
        }

        console.log(`💰 총 적립 포인트: ${totalEarnedPoints}P (${paymentIds.length}개 payments)`);

      } else {
        // 단일 주문인 경우 (기존 로직)
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
        userId = earnRecord.user_id;
        totalEarnedPoints = earnRecord.points;

        console.log(`✅ 적립 내역 발견: user_id=${userId}, ${totalEarnedPoints}P`);
      }

      if (totalEarnedPoints === 0) {
        console.log(`⚠️  적립된 포인트가 없습니다. 건너뜁니다.`);
        continue;
      }

      const earnedPoints = totalEarnedPoints;

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

      // 🔧 CRITICAL FIX: 실제 회수 가능한 포인트만 계산
      const actualDeduction = Math.min(earnedPoints, currentPoints);
      const newBalance = currentPoints - actualDeduction;

      console.log(`💰 포인트 계산:`);
      console.log(`   현재 잔액: ${currentPoints}P`);
      console.log(`   적립 포인트: ${earnedPoints}P`);
      console.log(`   실제 회수: ${actualDeduction}P`);
      console.log(`   회수 후: ${newBalance}P`);

      if (actualDeduction < earnedPoints) {
        const shortfall = earnedPoints - actualDeduction;
        console.warn(`⚠️  포인트 부족! ${shortfall}P는 이미 사용되어 회수 불가`);
      }

      if (actualDeduction === 0) {
        console.warn(`⚠️  회수할 포인트가 없습니다 (잔액 0P). 건너뜁니다.`);
        continue;
      }

      // 4. 트랜잭션 시작
      await poolNeon.query('BEGIN');

      try {
        // 5. Neon - users 테이블 포인트 차감
        await poolNeon.query(`
          UPDATE users SET total_points = $1 WHERE id = $2
        `, [newBalance, userId]);

        // 6. PlanetScale - user_points 테이블에 회수 내역 추가
        // 🔧 CRITICAL FIX: 실제 회수된 포인트만 기록
        await connection.execute(`
          INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
          VALUES (?, ?, 'refund', ?, ?, ?, NOW())
        `, [
          userId,
          -actualDeduction,  // ✅ 실제 회수된 포인트만 기록
          actualDeduction < earnedPoints
            ? `[수동 회수] 환불 포인트 부분 회수 (주문: ${item.orderNumber}, 적립: ${earnedPoints}P, 회수: ${actualDeduction}P, 부족: ${earnedPoints - actualDeduction}P)`
            : `[수동 회수] 환불로 인한 포인트 회수 (주문번호: ${item.orderNumber})`,
          item.orderNumber,
          newBalance
        ]);

        // 7. 커밋
        await poolNeon.query('COMMIT');

        console.log(`✅ 포인트 회수 완료: -${actualDeduction}P (user_id=${userId})`);

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
