const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkCartRefund() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('='.repeat(80));
  console.log('[중요] 장바구니 주문 환불 시 포인트 회수 문제');
  console.log('='.repeat(80));

  // 1. 장바구니 주문 찾기 (ORDER_로 시작)
  const cartPayments = await conn.execute(`
    SELECT gateway_transaction_id as order_number, COUNT(*) as category_count
    FROM payments
    WHERE gateway_transaction_id LIKE 'ORDER_%'
    GROUP BY gateway_transaction_id
    HAVING COUNT(*) > 1
    LIMIT 3
  `);

  console.log('\n장바구니 주문 (여러 카테고리):');

  if (!cartPayments.rows || cartPayments.rows.length === 0) {
    console.log('  장바구니 주문 없음 (모든 주문이 단일 카테고리)');
    return;
  }

  for (const cart of cartPayments.rows) {
    console.log(`\n  주문번호: ${cart.order_number}`);
    console.log(`  카테고리 수: ${cart.category_count}개`);

    // 각 카테고리 payment_id 조회
    const payments = await conn.execute(`
      SELECT id, amount, payment_status
      FROM payments
      WHERE gateway_transaction_id = ?
      ORDER BY id ASC
    `, [cart.order_number]);

    let totalEarned = 0;
    let earnedDetails = [];

    for (const payment of payments.rows) {
      const earned = await conn.execute(`
        SELECT SUM(points) as total
        FROM user_points
        WHERE related_order_id = ? AND point_type = 'earn' AND points > 0
      `, [String(payment.id)]);

      const points = parseInt(earned.rows?.[0]?.total || 0);
      if (points > 0) {
        totalEarned += points;
        earnedDetails.push(`payment_id=${payment.id}: ${points}P`);
      }
    }

    if (totalEarned > 0) {
      console.log(`  적립 내역:`);
      earnedDetails.forEach(detail => console.log(`    - ${detail}`));
      console.log(`  총 적립: ${totalEarned}P`);

      // 현재 환불 로직으로 회수 가능한 포인트
      const firstPayment = payments.rows[0];
      const firstEarned = await conn.execute(`
        SELECT SUM(points) as total
        FROM user_points
        WHERE related_order_id = ? AND point_type = 'earn' AND points > 0
      `, [String(firstPayment.id)]);

      const firstPoints = parseInt(firstEarned.rows?.[0]?.total || 0);

      console.log(`  현재 환불 로직 (payment.id만 사용):`);
      console.log(`    - 회수될 포인트: ${firstPoints}P (payment_id=${firstPayment.id})`);
      console.log(`    - 누락될 포인트: ${totalEarned - firstPoints}P`);

      if (totalEarned > firstPoints) {
        console.log(`  ⚠️  문제: 장바구니 환불 시 ${totalEarned - firstPoints}P가 회수되지 않음!`);
      }
    }
  }
}

checkCartRefund();
