const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const planetscale = connect({ url: process.env.DATABASE_URL });
const neonPool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 Payment ID 67 포인트 처리 확인:\n');

    // 1. payment_id 67 기본 정보
    const paymentResult = await planetscale.execute(`
      SELECT id, user_id, amount, payment_status, notes, created_at
      FROM payments
      WHERE id = 67
    `);

    if (paymentResult.rows && paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];
      console.log('📋 Payment 정보:');
      console.log(`  ID: ${payment.id}`);
      console.log(`  User ID: ${payment.user_id}`);
      console.log(`  Amount: ₩${payment.amount}`);
      console.log(`  Status: ${payment.payment_status}`);
      console.log(`  Created: ${payment.created_at}`);

      try {
        const notes = JSON.parse(payment.notes);
        console.log(`  Notes: subtotal=${notes.subtotal}, pointsUsed=${notes.pointsUsed || 0}\n`);
      } catch (e) {
        console.log(`  Notes: ${payment.notes}\n`);
      }

      const userId = payment.user_id;

      // 2. 이 결제 관련 모든 포인트 내역
      console.log('📊 Payment 67 관련 포인트 내역:');
      const pointsResult = await planetscale.execute(`
        SELECT id, points, point_type, reason, balance_after, created_at
        FROM user_points
        WHERE user_id = ? AND (related_order_id = '67' OR reason LIKE '%payment_id: 67%' OR reason LIKE '%주문번호: 67%')
        ORDER BY created_at ASC
      `, [userId]);

      if (pointsResult.rows && pointsResult.rows.length > 0) {
        pointsResult.rows.forEach(row => {
          const sign = row.points > 0 ? '+' : '';
          console.log(`  [${row.id}] ${row.point_type}: ${sign}${row.points}P (balance_after: ${row.balance_after}P)`);
          console.log(`      ${row.reason}`);
          console.log(`      ${row.created_at}`);
        });
      } else {
        console.log('  ❌ 포인트 내역 없음!');
      }

      // 3. Neon 현재 잔액
      console.log('\n💰 Neon users.total_points:');
      const neonResult = await neonPool.query('SELECT id, email, total_points FROM users WHERE id = $1', [userId]);

      if (neonResult.rows && neonResult.rows.length > 0) {
        const user = neonResult.rows[0];
        console.log(`  User ${user.id} (${user.email}): ${user.total_points}P`);

        // 4. PlanetScale 전체 내역 확인
        const allPointsResult = await planetscale.execute(`
          SELECT SUM(points) as total, COUNT(*) as count
          FROM user_points
          WHERE user_id = ?
        `, [userId]);

        const planetscaleTotal = allPointsResult.rows[0]?.total || 0;
        const recordCount = allPointsResult.rows[0]?.count || 0;

        console.log(`\n📊 비교:`);
        console.log(`  Neon total_points: ${user.total_points}P`);
        console.log(`  PlanetScale 전체 SUM: ${planetscaleTotal}P (${recordCount}건)`);
        console.log(`  차이: ${user.total_points - planetscaleTotal}P`);

        // 5. 최근 포인트 내역
        console.log(`\n📜 최근 포인트 내역 (최신 5건):`);
        const recentResult = await planetscale.execute(`
          SELECT id, points, point_type, reason, balance_after, created_at
          FROM user_points
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 5
        `, [userId]);

        recentResult.rows.forEach(row => {
          const sign = row.points > 0 ? '+' : '';
          console.log(`  [${row.id}] ${sign}${row.points}P → balance_after: ${row.balance_after}P`);
          console.log(`      ${row.reason}`);
        });

        // 6. balance_after 최신 값
        if (recentResult.rows && recentResult.rows.length > 0) {
          const latestBalance = recentResult.rows[0].balance_after;
          console.log(`\n⚠️ 문제 발견:`);
          console.log(`  최근 거래의 balance_after: ${latestBalance}P`);
          console.log(`  Neon total_points: ${user.total_points}P`);

          if (latestBalance !== user.total_points) {
            console.log(`  ❌ 동기화 안됨! Neon을 ${latestBalance}P로 수정 필요`);
          } else {
            console.log(`  ✅ 동기화 정상`);
          }
        }
      }

    } else {
      console.log('❌ Payment 67을 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await neonPool.end();
  }

  process.exit(0);
})();
