const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    // 장바구니 주문 포인트 적립 확인 (payment_id로 적립된 경우)
    const result = await connection.execute(`
      SELECT COUNT(*) as count
      FROM user_points
      WHERE reason LIKE '%payment_id:%' AND point_type = 'earn'
    `);

    console.log('🔍 장바구니 주문 포인트 적립 확인:\n');
    console.log(`장바구니 포인트 적립 건수: ${result.rows[0].count}건\n`);

    // 샘플 조회
    const result2 = await connection.execute(`
      SELECT id, user_id, points, reason, created_at
      FROM user_points
      WHERE reason LIKE '%payment_id:%' AND point_type = 'earn'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (result2.rows && result2.rows.length > 0) {
      console.log('장바구니 포인트 적립 샘플:');
      result2.rows.forEach(r => {
        console.log(`  User ${r.user_id}: +${r.points}P - ${r.reason} (${r.created_at})`);
      });
    } else {
      console.log('⚠️  장바구니 주문으로 적립된 포인트가 없습니다!');
      console.log('    모든 장바구니 주문(ORDER_)이 포인트 적립에 실패하고 있을 수 있습니다.');
    }

    console.log('\n');

    // 단일 예약 포인트 적립 확인 (booking_id로 적립된 경우)
    const result3 = await connection.execute(`
      SELECT COUNT(*) as count
      FROM user_points
      WHERE reason LIKE '%booking_id:%' AND point_type = 'earn'
    `);

    console.log(`단일 예약 포인트 적립 건수: ${result3.rows[0].count}건`);

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
})();
