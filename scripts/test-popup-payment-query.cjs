const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    // 실제 confirm.js에서 사용하는 쿼리와 동일
    const testOrderId = 'ORDER_29653b4d-9a4a-4474-8e77-77d3da26ac00';

    console.log(`🔍 confirm.js 쿼리 테스트: orderId = "${testOrderId}"\n`);

    const orders = await connection.execute(
      'SELECT * FROM payments WHERE gateway_transaction_id = ? ORDER BY id ASC',
      [testOrderId]
    );

    console.log(`결과: ${orders.rows?.length || 0}개 payment 조회됨\n`);

    if (orders.rows && orders.rows.length > 0) {
      const allPayments = orders.rows;
      const order = allPayments[0];
      const userId = order.user_id;

      console.log(`✅ Payments 조회 성공:`);
      console.log(`   - user_id: ${userId}`);
      console.log(`   - payment 개수: ${allPayments.length}개\n`);

      // 포인트 적립 시뮬레이션
      console.log(`💰 포인트 적립 시뮬레이션:\n`);

      for (const categoryPayment of allPayments) {
        const notes = categoryPayment.notes ? JSON.parse(categoryPayment.notes) : null;
        const originalSubtotal = notes?.subtotal || 0;
        const pointsToEarn = Math.floor(originalSubtotal * 0.02);

        console.log(`   Payment ID ${categoryPayment.id}:`);
        console.log(`     subtotal: ${originalSubtotal}원`);
        console.log(`     포인트 적립 예정: ${pointsToEarn}P`);

        if (pointsToEarn > 0) {
          console.log(`     ✅ 포인트 적립 가능`);
        } else {
          console.log(`     ❌ 포인트 적립 불가 (subtotal이 0원)`);
        }
      }
    } else {
      console.log(`❌ Payments 조회 실패 - gateway_transaction_id로 payment를 찾을 수 없음`);
      console.log(`\n   이것이 문제의 원인일 수 있습니다!`);
      console.log(`   confirm.js가 호출되었지만 payments를 찾지 못하면 포인트가 적립되지 않습니다.`);
    }

    // 추가 확인: 이 payment가 실제로 존재하는지 직접 조회
    console.log(`\n📋 추가 확인: payment ID 63 직접 조회:\n`);
    const directQuery = await connection.execute(
      'SELECT id, gateway_transaction_id, payment_status FROM payments WHERE id = 63'
    );

    if (directQuery.rows && directQuery.rows.length > 0) {
      const p = directQuery.rows[0];
      console.log(`   ID: ${p.id}`);
      console.log(`   gateway_transaction_id: ${p.gateway_transaction_id}`);
      console.log(`   payment_status: ${p.payment_status}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
})();
