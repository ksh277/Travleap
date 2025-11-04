/**
 * 수동 포인트 적립 스크립트
 * 구문 오류 수정 전 결제 건에 대한 포인트 수동 적립
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function manualAddPoints() {
  const orderNumber = 'ORDER_1762241462901_3127';
  const pointsToAdd = 150;
  const reason = '수동 적립 (구문 오류 수정 전 결제 건)';

  console.log('💰 [수동 포인트 적립] 시작...');
  console.log(`   주문번호: ${orderNumber}`);
  console.log(`   적립 포인트: ${pointsToAdd}P\n`);

  // PlanetScale 연결
  const connection = connect({ url: process.env.DATABASE_URL });

  // Neon 연결
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    // 1. 주문 정보에서 user_id 조회
    const paymentResult = await connection.execute(
      'SELECT user_id, amount FROM payments WHERE gateway_transaction_id = ? LIMIT 1',
      [orderNumber]
    );

    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      throw new Error(`주문을 찾을 수 없습니다: ${orderNumber}`);
    }

    const payment = paymentResult.rows[0];
    const userId = payment.user_id;
    const amount = payment.amount;

    console.log(`✅ 주문 조회 성공:`);
    console.log(`   user_id: ${userId}`);
    console.log(`   결제금액: ${amount}원\n`);

    // 2. 이미 적립된 포인트가 있는지 확인
    const existingPoints = await connection.execute(
      `SELECT id, points FROM user_points 
       WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn'`,
      [userId, orderNumber]
    );

    if (existingPoints.rows && existingPoints.rows.length > 0) {
      console.log(`⚠️  이미 포인트가 적립되어 있습니다:`);
      existingPoints.rows.forEach(row => {
        console.log(`   - ${row.points}P (id: ${row.id})`);
      });
      console.log('\n계속 진행하시겠습니까? (이중 적립 방지)');
      return;
    }

    // 3. Neon에서 현재 포인트 조회 및 업데이트
    await poolNeon.query('BEGIN');

    const userResult = await poolNeon.query(
      'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      throw new Error(`사용자를 찾을 수 없습니다: user_id=${userId}`);
    }

    const currentPoints = userResult.rows[0].total_points || 0;
    const newBalance = currentPoints + pointsToAdd;

    console.log(`📊 포인트 현황:`);
    console.log(`   현재: ${currentPoints}P`);
    console.log(`   적립: +${pointsToAdd}P`);
    console.log(`   최종: ${newBalance}P\n`);

    // 4. PlanetScale user_points 테이블에 기록 추가
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1년 후 만료

    await connection.execute(
      `INSERT INTO user_points 
       (user_id, points, point_type, reason, related_order_id, balance_after, expires_at, created_at)
       VALUES (?, ?, 'earn', ?, ?, ?, ?, NOW())`,
      [userId, pointsToAdd, reason, orderNumber, newBalance, expiresAt]
    );

    console.log(`✅ PlanetScale user_points 테이블 기록 완료`);

    // 5. Neon users 테이블 total_points 업데이트
    await poolNeon.query(
      'UPDATE users SET total_points = $1 WHERE id = $2',
      [newBalance, userId]
    );

    console.log(`✅ Neon users 테이블 업데이트 완료`);

    await poolNeon.query('COMMIT');
    console.log(`✅ 트랜잭션 커밋 완료\n`);

    console.log(`🎉 포인트 적립 완료!`);
    console.log(`   주문번호: ${orderNumber}`);
    console.log(`   사용자: user_id=${userId}`);
    console.log(`   적립: ${pointsToAdd}P`);
    console.log(`   최종 잔액: ${newBalance}P`);

  } catch (error) {
    console.error('\n❌ 포인트 적립 실패:', error.message);
    
    try {
      await poolNeon.query('ROLLBACK');
      console.log('🔄 트랜잭션 롤백 완료');
    } catch (rollbackError) {
      console.error('❌ 롤백 실패:', rollbackError.message);
    }
    
    process.exit(1);
  } finally {
    await poolNeon.end();
  }
}

manualAddPoints().catch(console.error);
