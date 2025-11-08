require('dotenv').config();
const { connect } = require('@planetscale/database');

async function fixMissingOrderNumbers() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔧 주문번호 없는 주문 수정 시작...\n');

  try {
    // 1. 주문번호 없는 주문 조회
    const checkResult = await connection.execute(`
      SELECT id, gateway_transaction_id, payment_status, amount, created_at
      FROM payments
      WHERE (gateway_transaction_id IS NULL OR gateway_transaction_id = '')
        AND payment_status IN ('paid', 'completed', 'refunded')
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const ordersWithoutNumber = checkResult.rows || [];
    console.log(`📊 주문번호 없는 주문: ${ordersWithoutNumber.length}개\n`);

    if (ordersWithoutNumber.length === 0) {
      console.log('✅ 모든 주문에 주문번호가 있습니다!');
      return;
    }

    ordersWithoutNumber.forEach(order => {
      console.log(`  - ID ${order.id}: ₩${order.amount}, ${order.payment_status}, ${order.created_at}`);
    });

    console.log('\n🔧 주문번호 생성 중...\n');

    // 2. 주문번호 생성 및 업데이트
    for (const order of ordersWithoutNumber) {
      const orderNumber = `ORD-${order.id}`;

      const updateResult = await connection.execute(`
        UPDATE payments
        SET gateway_transaction_id = ?
        WHERE id = ?
      `, [orderNumber, order.id]);

      console.log(`  ✅ ID ${order.id} → ${orderNumber}`);
    }

    console.log('\n✅ 주문번호 업데이트 완료!\n');

    // 3. 검증
    const verifyResult = await connection.execute(`
      SELECT id, gateway_transaction_id
      FROM payments
      WHERE id IN (${ordersWithoutNumber.map(o => o.id).join(',')})
    `);

    console.log('📊 업데이트 검증:');
    (verifyResult.rows || []).forEach(order => {
      console.log(`  - ID ${order.id}: ${order.gateway_transaction_id}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

fixMissingOrderNumbers()
  .then(() => {
    console.log('\n🎉 작업 완료!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 작업 실패:', err);
    process.exit(1);
  });
