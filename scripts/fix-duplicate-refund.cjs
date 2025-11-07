const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('🔧 중복 환불된 1340P 회수\n');

  // 현재 잔액 확인
  const current = await db.execute(`
    SELECT balance_after FROM user_points
    ORDER BY created_at DESC LIMIT 1
  `);
  const currentBalance = current.rows?.[0]?.balance_after || 0;
  console.log(`현재 잔액: ${currentBalance}P`);

  if (currentBalance !== 1340) {
    console.log(`⚠️  예상 잔액(1340P)과 다릅니다. 수동 확인 필요.`);
    process.exit(1);
  }

  // 중복 환불된 1340P 회수
  const newBalance = 0;
  await db.execute(`
    INSERT INTO user_points (
      user_id, points, point_type, reason, balance_after, created_at
    ) VALUES (?, ?, ?, ?, ?, NOW())
  `, [
    11,
    -1340,
    'admin',
    '[긴급 수정] payment_id=67 환불 시 중복 반환된 1340P 회수 (payment_id=66 포인트가 이미 환불됨)',
    newBalance
  ]);

  console.log(`✅ -1340P 회수 완료 → 새 잔액: ${newBalance}P`);
  console.log(`\n📝 설명:`);
  console.log(`  - payment_id=66 환불 시 1340P 회수 (정상)`);
  console.log(`  - payment_id=67 환불 시 1340P 반환 (잘못됨)`);
  console.log(`  - 실제로는 payment_id=66에서 적립된 포인트가 payment_id=67에서 사용되었으므로`);
  console.log(`    payment_id=66 환불 시 이미 회수되었어야 함`);

  process.exit(0);
})();
