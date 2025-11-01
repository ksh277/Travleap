/**
 * 포인트 회수 검증 스크립트
 * 실제 DB 데이터를 확인하여 포인트 회수가 제대로 되었는지 검증
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const USER_ID = 11; // 사용자 ID
const ORDER_NUMBERS = [
  'ORDER_1761955928607_5256'  // 최신 주문 (포인트 적립 안됨 확인)
];

async function verifyPointDeduction() {
  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  console.log('🔍 [포인트 회수 검증] 시작...\n');

  try {
    // 1. Neon PostgreSQL에서 사용자 총 포인트 확인
    console.log('📊 [1단계] Neon PostgreSQL - users 테이블 확인');
    const userResult = await poolNeon.query(`
      SELECT id, email, total_points
      FROM users
      WHERE id = $1
    `, [USER_ID]);

    if (userResult.rows && userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`✅ 사용자: ${user.email} (ID: ${user.id})`);
      console.log(`💰 총 포인트: ${user.total_points}P\n`);
    } else {
      console.log('❌ 사용자를 찾을 수 없습니다.\n');
      return;
    }

    // 2. payments 테이블에서 주문 정보 조회
    console.log('📊 [2단계] payments 테이블 - 주문 정보 확인');

    for (const orderNumber of ORDER_NUMBERS) {
      console.log(`\n📌 주문번호: ${orderNumber}`);

      // 해당 주문의 모든 payments 조회
      const paymentsResult = await connection.execute(`
        SELECT id, user_id, amount, payment_status, payment_key, notes, created_at
        FROM payments
        WHERE gateway_transaction_id = ?
        ORDER BY id ASC
      `, [orderNumber]);

      if (!paymentsResult.rows || paymentsResult.rows.length === 0) {
        console.log(`  ❌ 주문을 찾을 수 없습니다!`);
        continue;
      }

      console.log(`\n  💳 Payments (${paymentsResult.rows.length}건):`);
      let totalExpected = 0;
      let totalActual = 0;

      for (const payment of paymentsResult.rows) {
        const notes = payment.notes ? JSON.parse(payment.notes) : {};
        const subtotal = notes.subtotal || 0;
        const expectedPoints = Math.floor(subtotal * 0.02);
        totalExpected += expectedPoints;

        console.log(`\n  📦 payment_id: ${payment.id}`);
        console.log(`     amount: ${payment.amount}원`);
        console.log(`     payment_status: ${payment.payment_status}`);
        console.log(`     payment_key: ${payment.payment_key || '없음'}`);
        console.log(`     subtotal: ${subtotal}원`);
        console.log(`     예상 적립: ${expectedPoints}P`);

        // payment_id로 적립 내역 조회
        const earnResult = await connection.execute(`
          SELECT id, points, reason, created_at
          FROM user_points
          WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn'
        `, [USER_ID, String(payment.id)]);

        if (earnResult.rows && earnResult.rows.length > 0) {
          const actualPoints = earnResult.rows[0].points;
          totalActual += actualPoints;
          console.log(`     ✅ 적립 완료: ${actualPoints}P`);
          console.log(`     적립 일시: ${new Date(earnResult.rows[0].created_at).toLocaleString('ko-KR')}`);
        } else {
          console.log(`     ❌ 적립 내역 없음!`);
        }
      }

      console.log(`\n  📊 적립 통계:`);
      console.log(`     예상 적립: ${totalExpected}P`);
      console.log(`     실제 적립: ${totalActual}P`);
      if (totalActual === 0) {
        console.error(`     ❌❌❌ 포인트가 전혀 적립되지 않았습니다!`);
      } else if (totalActual < totalExpected) {
        console.warn(`     ⚠️  일부만 적립됨 (부족: ${totalExpected - totalActual}P)`);
      } else {
        console.log(`     ✅ 정상 적립됨`);
      }
    }

    // 3. 최근 포인트 내역 10개 조회
    console.log('\n\n📊 [3단계] 최근 포인트 내역 (최신순 10개)');
    const recentResult = await connection.execute(`
      SELECT points, point_type, reason, related_order_id, balance_after, created_at
      FROM user_points
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [USER_ID]);

    if (recentResult.rows && recentResult.rows.length > 0) {
      console.log('\n순번 | 타입   | 포인트  | 잔액    | 주문번호                        | 일시');
      console.log('─'.repeat(100));
      recentResult.rows.forEach((row, idx) => {
        const date = new Date(row.created_at).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        const type = row.point_type === 'earn' ? '적립' :
                     row.point_type === 'refund' ? '회수' :
                     row.point_type === 'use' ? '사용' : row.point_type;
        const points = String(row.points).padStart(7);
        const balance = String(row.balance_after).padStart(7);
        const orderId = (row.related_order_id || '-').substring(0, 30);
        console.log(`${String(idx + 1).padStart(3)} | ${type.padEnd(6)} | ${points}P | ${balance}P | ${orderId.padEnd(30)} | ${date}`);
      });
    }

    // 4. payments 테이블 확인 (order_id_str 존재 여부)
    console.log('\n\n📊 [4단계] payments 테이블 - order_id_str 확인');
    const paymentsResult = await connection.execute(`
      SELECT
        id,
        order_id_str,
        gateway_transaction_id,
        payment_status,
        amount,
        refunded_at,
        created_at
      FROM payments
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [USER_ID]);

    if (paymentsResult.rows && paymentsResult.rows.length > 0) {
      console.log('\nID  | order_id_str                    | 상태      | 금액     | 일시');
      console.log('─'.repeat(100));
      paymentsResult.rows.forEach(row => {
        const date = new Date(row.created_at).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        const orderId = (row.order_id_str || row.gateway_transaction_id || '-').substring(0, 30);
        const status = row.payment_status === 'paid' ? '결제완료' :
                      row.payment_status === 'refunded' ? '환불완료' : row.payment_status;
        console.log(`${String(row.id).padStart(3)} | ${orderId.padEnd(30)} | ${status.padEnd(9)} | ${String(row.amount).padStart(8)}원 | ${date}`);
      });
    }

    console.log('\n\n✅ [검증 완료]\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
  } finally {
    await poolNeon.end();
    process.exit(0);
  }
}

verifyPointDeduction();
