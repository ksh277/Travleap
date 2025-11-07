const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('📊 최근 환불 내역 및 포인트 체인 확인\n');

  // 최근 환불된 결제 확인
  const refunds = await db.execute(`
    SELECT id, user_id, amount, points_used, refund_amount,
           payment_status, notes, created_at, updated_at, refunded_at
    FROM payments
    WHERE payment_status = 'refunded'
    ORDER BY refunded_at DESC
    LIMIT 5
  `);

  console.log('=== 최근 환불된 결제 ===');
  for (const r of refunds.rows || []) {
    let notesData = {};
    try {
      notesData = JSON.parse(r.notes || '{}');
    } catch (e) {}

    const pointsEarned = notesData.pointsEarned || 0;

    console.log(`\npayment_id=${r.id} (user_id=${r.user_id})`);
    console.log(`  - 결제금액: ${parseFloat(r.amount).toLocaleString()}원`);
    console.log(`  - 환불금액: ${parseFloat(r.refund_amount || 0).toLocaleString()}원`);
    console.log(`  - 적립 포인트: ${pointsEarned}P (이 주문에서 적립)`);
    console.log(`  - 사용 포인트: ${r.points_used || 0}P (이 주문에서 사용)`);
    console.log(`  - 결제일: ${r.created_at}`);
    console.log(`  - 환불일: ${r.refunded_at || r.updated_at}`);
    if (r.notes) {
      console.log(`  - notes: ${r.notes.substring(0, 100)}...`);
    }
  }

  // 포인트 내역 확인
  console.log('\n\n=== 최근 포인트 변동 내역 (최근 20건) ===');
  const points = await db.execute(`
    SELECT id, user_id, point_type, points, balance_after, reason, related_payment_id, created_at
    FROM user_points
    ORDER BY created_at DESC
    LIMIT 20
  `);

  for (const p of points.rows || []) {
    const sign = p.points > 0 ? '+' : '';
    const emoji = p.points > 0 ? '💰' : '📤';
    console.log(`${emoji} [${(p.point_type || 'unknown').padEnd(12)}] ${sign}${p.points}P → 잔액: ${p.balance_after}P (payment_id=${p.related_payment_id || 'N/A'})`);
    console.log(`   └─ ${p.reason} (${p.created_at})`);
  }

  // PlanetScale 최종 잔액
  const lastPoint = await db.execute(`
    SELECT balance_after, user_id FROM user_points
    ORDER BY created_at DESC LIMIT 1
  `);
  const psBalance = lastPoint.rows?.[0]?.balance_after || 0;
  const userId = lastPoint.rows?.[0]?.user_id || 0;
  console.log(`\n💾 현재 PlanetScale 포인트 잔액: ${psBalance}P (user_id=${userId})`);

  // 환불 시 포인트 회수 내역 분석
  console.log('\n\n=== 환불 시 포인트 처리 분석 ===');
  const refundPoints = await db.execute(`
    SELECT *
    FROM user_points
    WHERE point_type = 'refund' AND points < 0
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log('환불 시 포인트 회수 내역 (마이너스):');
  for (const rp of refundPoints.rows || []) {
    console.log(`  📤 ${rp.points}P 회수 → 잔액: ${rp.balance_after}P (payment_id=${rp.related_payment_id})`);
    console.log(`     └─ ${rp.reason} (${rp.created_at})`);
  }

  const refundPointsPositive = await db.execute(`
    SELECT *
    FROM user_points
    WHERE point_type = 'refund' AND points > 0
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log('\n환불 시 포인트 반환 내역 (플러스):');
  for (const rp of refundPointsPositive.rows || []) {
    console.log(`  💰 +${rp.points}P 반환 → 잔액: ${rp.balance_after}P (payment_id=${rp.related_payment_id})`);
    console.log(`     └─ ${rp.reason} (${rp.created_at})`);
  }

  process.exit(0);
})();
