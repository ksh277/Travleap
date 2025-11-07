/**
 * Payment ID 69 (렌트카) 포인트 수동 적립
 *
 * payment_id=69: RC17624938218172RGMI, 79,000원
 * 적립 예정: 79,000원 * 2% = 1,580P
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function fixPayment69Points() {
  const conn = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

  console.log('💰 Payment ID 69 렌트카 포인트 수동 적립 시작...\n');

  try {
    // 1. Payment 정보 확인
    const paymentResult = await conn.execute('SELECT * FROM payments WHERE id = 69');
    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      console.error('❌ payment_id=69를 찾을 수 없습니다.');
      return;
    }

    const payment = paymentResult.rows[0];
    console.log('📋 Payment 정보:');
    console.log(`   ID: ${payment.id}`);
    console.log(`   User ID: ${payment.user_id}`);
    console.log(`   Order ID: ${payment.order_id_str}`);
    console.log(`   Amount: ₩${payment.amount.toLocaleString()}`);
    console.log(`   Status: ${payment.payment_status}`);
    console.log(`   Created: ${payment.created_at}\n`);

    if (payment.payment_status !== 'paid') {
      console.error(`❌ payment_status가 'paid'가 아닙니다: ${payment.payment_status}`);
      return;
    }

    // 2. 이미 적립되었는지 확인
    const existingPoints = await conn.execute(`
      SELECT * FROM user_points
      WHERE related_order_id = '69' AND point_type = 'earn'
    `);

    if (existingPoints.rows && existingPoints.rows.length > 0) {
      console.error('❌ 이미 포인트가 적립되어 있습니다:');
      existingPoints.rows.forEach(row => {
        console.log(`   - ${row.points}P (${row.created_at})`);
      });
      return;
    }

    // 3. 포인트 계산
    const amount = parseFloat(payment.amount);
    const pointsToEarn = Math.floor(amount * 0.02);

    console.log(`💰 포인트 계산:`);
    console.log(`   결제 금액: ₩${amount.toLocaleString()}`);
    console.log(`   적립률: 2%`);
    console.log(`   적립 포인트: ${pointsToEarn}P\n`);

    // 4. 트랜잭션 시작
    await poolNeon.query('BEGIN');

    // 5. Neon에서 현재 포인트 조회 및 FOR UPDATE 락
    const userResult = await poolNeon.query('SELECT total_points FROM users WHERE id = $1 FOR UPDATE', [payment.user_id]);

    if (!userResult.rows || userResult.rows.length === 0) {
      console.error(`❌ user_id=${payment.user_id}를 찾을 수 없습니다.`);
      await poolNeon.query('ROLLBACK');
      return;
    }

    // 6. PlanetScale에서 최신 balance_after 조회
    const latestBalanceResult = await conn.execute(`
      SELECT balance_after
      FROM user_points
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `, [payment.user_id]);

    let currentPoints = 0;
    if (latestBalanceResult.rows && latestBalanceResult.rows.length > 0) {
      currentPoints = latestBalanceResult.rows[0].balance_after || 0;
      console.log(`📊 현재 포인트 (PlanetScale balance_after): ${currentPoints}P`);
    } else {
      currentPoints = userResult.rows[0].total_points || 0;
      console.log(`📊 현재 포인트 (Neon total_points): ${currentPoints}P`);
    }

    const newBalance = currentPoints + pointsToEarn;

    // 7. PlanetScale user_points에 적립 내역 추가
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // 1년 후 만료

    await conn.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, expires_at, created_at)
      VALUES (?, ?, 'earn', ?, ?, ?, ?, NOW())
    `, [
      payment.user_id,
      pointsToEarn,
      `[수동 적립] 렌트카 예약 적립 (booking_number: ${payment.order_id_str})`,
      String(payment.id),
      newBalance,
      expiresAt
    ]);

    console.log(`✅ PlanetScale user_points에 적립 내역 추가 완료`);

    // 8. Neon users 테이블 포인트 업데이트
    await poolNeon.query(`
      UPDATE users SET total_points = $1 WHERE id = $2
    `, [newBalance, payment.user_id]);

    console.log(`✅ Neon users 테이블 포인트 업데이트 완료`);

    // 9. 커밋
    await poolNeon.query('COMMIT');

    console.log(`\n✅ 포인트 수동 적립 완료!`);
    console.log(`   사용자 ID: ${payment.user_id}`);
    console.log(`   적립 포인트: ${pointsToEarn}P`);
    console.log(`   최종 잔액: ${newBalance}P\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    try {
      await poolNeon.query('ROLLBACK');
      console.log('🔄 트랜잭션 롤백 완료');
    } catch (rollbackError) {
      console.error('❌ 롤백 실패:', rollbackError);
    }
    throw error;
  } finally {
    await poolNeon.end();
  }
}

fixPayment69Points().catch(console.error);
