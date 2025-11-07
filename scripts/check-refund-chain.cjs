const { connect } = require('@planetscale/database');
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await poolNeon.connect();

  console.log('📊 최근 환불 내역 및 포인트 체인 확인\n');

  // 최근 환불된 결제 확인
  const refunds = await db.execute(`
    SELECT id, user_id, order_number, amount, points_earned, points_used,
           payment_status, notes, created_at
    FROM payments
    WHERE payment_status = 'refunded'
    ORDER BY updated_at DESC
    LIMIT 5
  `);

  console.log('=== 최근 환불된 결제 ===');
  for (const r of refunds.rows || []) {
    console.log(`  payment_id=${r.id}`);
    console.log(`  - user_id: ${r.user_id}`);
    console.log(`  - amount: ${r.amount.toLocaleString()}원`);
    console.log(`  - points_earned: ${r.points_earned || 0}P (이 주문에서 적립된 포인트)`);
    console.log(`  - points_used: ${r.points_used || 0}P (이 주문에서 사용한 포인트)`);
    console.log(`  - created_at: ${r.created_at}`);
    console.log('');
  }

  // 포인트 내역 확인
  console.log('=== 최근 포인트 변동 내역 (최근 10건) ===');
  const points = await db.execute(`
    SELECT id, user_id, type, amount, balance_after, description, created_at
    FROM user_points
    ORDER BY created_at DESC
    LIMIT 10
  `);

  for (const p of points.rows || []) {
    const sign = p.amount > 0 ? '+' : '';
    const emoji = p.amount > 0 ? '💰' : '📤';
    console.log(`${emoji} [${p.type.padEnd(10)}] ${sign}${p.amount}P → 잔액: ${p.balance_after}P`);
    console.log(`   └─ ${p.description}`);
  }

  // 현재 잔액 확인
  const user = await poolNeon.query('SELECT id, email, total_points FROM users ORDER BY id DESC LIMIT 1');
  console.log(`\n💰 현재 Neon 포인트 잔액: ${user.rows[0].total_points}P (user_id=${user.rows[0].id}, ${user.rows[0].email})`);

  // PlanetScale 잔액 확인
  const lastPoint = await db.execute(`
    SELECT balance_after FROM user_points
    ORDER BY created_at DESC LIMIT 1
  `);
  const psBalance = lastPoint.rows?.[0]?.balance_after || 0;
  console.log(`💾 현재 PlanetScale 포인트 잔액: ${psBalance}P`);

  if (user.rows[0].total_points !== psBalance) {
    console.log(`\n⚠️  경고: Neon과 PlanetScale 잔액이 일치하지 않습니다!`);
    console.log(`   Neon: ${user.rows[0].total_points}P`);
    console.log(`   PlanetScale: ${psBalance}P`);
    console.log(`   차이: ${user.rows[0].total_points - psBalance}P`);
  } else {
    console.log(`\n✅ Neon과 PlanetScale 잔액이 일치합니다.`);
  }

  await poolNeon.end();
  process.exit(0);
})();
