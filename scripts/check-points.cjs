require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function checkPoints() {
  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  try {
    console.log('🔍 포인트 적립 문제 확인 시작...\n');

    const email = 'user@test.com';
    const orderNumber = 'ORDER_1761922261162_7787';

    // 1. Neon DB에서 사용자 조회
    console.log('👤 1. 사용자 정보 조회...');
    const userResult = await poolNeon.query(
      'SELECT id, name, email, total_points FROM users WHERE email = $1',
      [email]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      console.error(`❌ 사용자를 찾을 수 없습니다: ${email}`);
      return;
    }

    const user = userResult.rows[0];
    console.log(`✅ 사용자 정보:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   이름: ${user.name}`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   현재 포인트: ${user.total_points}P\n`);

    // 2. PlanetScale에서 주문 정보 조회
    console.log('📦 2. 주문 정보 조회...');
    const orderResult = await connection.execute(`
      SELECT id, user_id, amount, payment_status, notes, created_at
      FROM payments
      WHERE gateway_transaction_id = ?
    `, [orderNumber]);

    if (!orderResult.rows || orderResult.rows.length === 0) {
      console.error(`❌ 주문을 찾을 수 없습니다: ${orderNumber}`);
      return;
    }

    console.log(`✅ 주문 찾음: ${orderResult.rows.length}건\n`);

    for (const order of orderResult.rows) {
      const notes = order.notes ? JSON.parse(order.notes) : {};
      console.log(`   주문 ID: ${order.id}`);
      console.log(`   사용자 ID: ${order.user_id}`);
      console.log(`   금액: ${order.amount}원`);
      console.log(`   결제 상태: ${order.payment_status}`);
      console.log(`   주문 상품 금액: ${notes.subtotal || 0}원`);
      console.log(`   배송비: ${notes.deliveryFee || 0}원`);
      console.log(`   쿠폰 할인: ${notes.couponDiscount || 0}원`);
      console.log(`   포인트 사용: ${notes.pointsUsed || 0}P`);
      console.log(`   카테고리: ${notes.category || '없음'}`);
      console.log(`   주문일: ${order.created_at}`);

      // 예상 적립 포인트 계산 (상품 금액의 2%)
      const subtotal = notes.subtotal || 0;
      const expectedPoints = Math.floor(subtotal * 0.02);
      console.log(`   예상 적립 포인트: ${expectedPoints}P (상품 금액 ${subtotal}원의 2%)\n`);
    }

    // 3. user_points 테이블에서 포인트 내역 조회
    console.log('💰 3. 포인트 적립 내역 조회...');
    const pointsResult = await connection.execute(`
      SELECT id, user_id, points, point_type, reason, related_order_id, balance_after, created_at
      FROM user_points
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [user.id]);

    if (!pointsResult.rows || pointsResult.rows.length === 0) {
      console.error(`❌ 포인트 내역이 없습니다.\n`);
    } else {
      console.log(`✅ 최근 포인트 내역 (최대 10건):\n`);
      for (const point of pointsResult.rows) {
        // 포인트 타입 표시
        let typeLabel = '알 수 없음';
        if (point.point_type === 'earn') {
          typeLabel = '적립';
        } else if (point.point_type === 'use') {
          typeLabel = '사용';
        } else if (point.point_type === 'refund') {
          typeLabel = '회수';
        }

        console.log(`   [${point.created_at}]`);
        console.log(`   ${typeLabel}: ${point.points > 0 ? '+' : ''}${point.points}P`);
        console.log(`   사유: ${point.reason}`);
        console.log(`   관련 주문 ID: ${point.related_order_id}`);
        console.log(`   적용 후 잔액: ${point.balance_after}P\n`);
      }
    }

    // 4. 해당 주문에 대한 포인트 적립 기록 확인
    console.log(`🔍 4. 주문 ${orderNumber}에 대한 포인트 적립 확인...\n`);

    let foundPoints = false;
    for (const order of orderResult.rows) {
      const orderPointsResult = await connection.execute(`
        SELECT id, points, reason, created_at, balance_after
        FROM user_points
        WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn'
      `, [user.id, String(order.id)]);

      if (orderPointsResult.rows && orderPointsResult.rows.length > 0) {
        foundPoints = true;
        console.log(`✅ payment_id=${order.id}에 대한 포인트 적립 기록 있음:`);
        for (const p of orderPointsResult.rows) {
          console.log(`   적립: +${p.points}P`);
          console.log(`   사유: ${p.reason}`);
          console.log(`   날짜: ${p.created_at}`);
          console.log(`   잔액: ${p.balance_after}P\n`);
        }
      } else {
        console.log(`❌ payment_id=${order.id}에 대한 포인트 적립 기록 없음\n`);
      }
    }

    if (!foundPoints) {
      console.error(`\n❌❌❌ 문제 발견: 주문이 완료되었으나 포인트가 적립되지 않았습니다!\n`);
      console.log(`📋 문제 해결 방법:`);
      console.log(`   1. 서버 로그 확인: 포인트 적립 실패 원인 확인`);
      console.log(`   2. payments 테이블의 payment_status가 'paid'인지 확인`);
      console.log(`   3. 결제 확인(confirm) API가 정상 호출되었는지 확인`);
      console.log(`   4. 필요시 수동으로 포인트 적립 처리\n`);

      // 수동 적립 명령 생성
      const totalExpectedPoints = orderResult.rows.reduce((sum, order) => {
        const notes = order.notes ? JSON.parse(order.notes) : {};
        return sum + Math.floor((notes.subtotal || 0) * 0.02);
      }, 0);

      if (totalExpectedPoints > 0) {
        console.log(`💡 수동 포인트 적립 명령:`);
        console.log(`   예상 적립 포인트: ${totalExpectedPoints}P`);
        console.log(`   node scripts/manual-add-points.cjs ${user.id} ${totalExpectedPoints} "주문 ${orderNumber} 적립 보상"\n`);
      }
    } else {
      console.log(`✅✅✅ 포인트가 정상적으로 적립되었습니다!\n`);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.error('Stack:', error.stack);
  } finally {
    await poolNeon.end();
  }
}

checkPoints();
