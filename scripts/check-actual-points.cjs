require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function checkActualPoints() {
  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  console.log('🔍 실제 포인트 상태 확인 (user_id=11)...\n');

  // 1. Neon total_points
  const neonResult = await poolNeon.query('SELECT total_points FROM users WHERE id = $1', [11]);
  console.log(`💰 Neon total_points: ${neonResult.rows[0].total_points}P\n`);

  // 2. PlanetScale 전체 포인트 내역
  const historyResult = await connection.execute(`
    SELECT id, points, point_type, reason, related_order_id, balance_after, created_at
    FROM user_points
    WHERE user_id = 11
    ORDER BY created_at DESC
    LIMIT 15
  `);

  console.log(`📊 최근 포인트 내역 ${historyResult.rows.length}건:\n`);
  historyResult.rows.forEach((row, idx) => {
    const date = new Date(row.created_at).toLocaleString('ko-KR');
    console.log(`${idx + 1}. [${date}] ${row.points}P (${row.point_type})`);
    console.log(`   이유: ${row.reason}`);
    console.log(`   related_order_id: ${row.related_order_id}`);
    console.log(`   잔액: ${row.balance_after}P\n`);
  });

  // 3. 최근 환불 내역 확인
  const refundCheck = await connection.execute(`
    SELECT id, payment_key, order_number, amount, payment_status, refund_amount, refunded_at, user_id
    FROM payments
    WHERE user_id = 11
    ORDER BY created_at DESC
    LIMIT 5
  `);

  console.log(`\n💳 최근 결제/환불 내역 ${refundCheck.rows.length}건:\n`);
  refundCheck.rows.forEach((row, idx) => {
    console.log(`${idx + 1}. payment_id=${row.id}, status=${row.payment_status}`);
    console.log(`   order_number: ${row.order_number}`);
    console.log(`   amount: ${row.amount}원, refund_amount: ${row.refund_amount || 0}원`);
    console.log(`   refunded_at: ${row.refunded_at || 'N/A'}\n`);
  });

  await poolNeon.end();
}

checkActualPoints().catch(console.error);
