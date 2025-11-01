require('dotenv').config();
const { connect } = require('@planetscale/database');

const orderNumber = process.argv[2];

if (!orderNumber) {
  console.error('❌ 주문번호를 입력하세요: node scripts/check-order.cjs ORDER_XXX');
  process.exit(1);
}

async function main() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log(`🔍 주문 조회 시작: ${orderNumber}\n`);

    // 1. payments 테이블에서 주문 조회
    const paymentsResult = await connection.execute(`
      SELECT
        id,
        user_id,
        amount,
        payment_status,
        gateway_transaction_id,
        notes,
        created_at
      FROM payments
      WHERE gateway_transaction_id = ?
      ORDER BY created_at DESC
    `, [orderNumber]);

    if (paymentsResult.rows && paymentsResult.rows.length > 0) {
      console.log(`✅ payments 테이블에서 ${paymentsResult.rows.length}건 발견:\n`);

      for (const payment of paymentsResult.rows) {
        console.log(`   Payment ID: ${payment.id}`);
        console.log(`   User ID: ${payment.user_id}`);
        console.log(`   Amount: ${payment.amount}원`);
        console.log(`   Status: ${payment.payment_status}`);
        console.log(`   Gateway Transaction ID: ${payment.gateway_transaction_id}`);
        console.log(`   Created: ${payment.created_at}`);

        if (payment.notes) {
          try {
            const notes = JSON.parse(payment.notes);
            console.log(`   Notes:`);
            console.log(`     - Category: ${notes.category || 'N/A'}`);
            console.log(`     - Subtotal: ${notes.subtotal || 0}원`);
            console.log(`     - Items: ${notes.items?.length || 0}개`);
          } catch (e) {
            console.log(`   Notes: (파싱 실패)`);
          }
        }
        console.log('');

        // 포인트 적립 내역 확인
        const pointsResult = await connection.execute(`
          SELECT * FROM user_points
          WHERE user_id = ? AND related_order_id = ?
          ORDER BY created_at DESC
        `, [payment.user_id, String(payment.id)]);

        if (pointsResult.rows && pointsResult.rows.length > 0) {
          console.log(`   ✅ 포인트 내역 ${pointsResult.rows.length}건:`);
          for (const point of pointsResult.rows) {
            console.log(`     - ${point.created_at}: ${point.points}P (${point.point_type}) - ${point.reason}`);
          }
        } else {
          console.log(`   ❌ 포인트 적립 내역 없음 (payment_id=${payment.id})`);

          // related_order_id가 order_number인 경우도 확인
          const pointsResult2 = await connection.execute(`
            SELECT * FROM user_points
            WHERE user_id = ? AND related_order_id = ?
            ORDER BY created_at DESC
          `, [payment.user_id, orderNumber]);

          if (pointsResult2.rows && pointsResult2.rows.length > 0) {
            console.log(`   ✅ 포인트 내역 ${pointsResult2.rows.length}건 (order_number로 저장됨):`);
            for (const point of pointsResult2.rows) {
              console.log(`     - ${point.created_at}: ${point.points}P (${point.point_type}) - ${point.reason}`);
            }
          }
        }
        console.log('\n' + '='.repeat(60) + '\n');
      }
    } else {
      console.log(`❌ payments 테이블에서 주문을 찾을 수 없습니다.\n`);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.error(error.stack);
  }
}

main();
