/**
 * 환불 포인트 회수 심층 분석 스크립트
 *
 * 잠재적 문제점:
 * 1. 에러 발생 시 0을 반환 (Line 370) - 조용히 실패
 * 2. 트랜잭션 롤백 시 PlanetScale 업데이트 누락 가능
 * 3. 장바구니 주문 환불 시 여러 payment_id 처리
 */

const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
require('dotenv').config();

async function deepAnalysis() {
  console.log('='.repeat(80));
  console.log('환불 포인트 회수 심층 분석');
  console.log('='.repeat(80));

  const neon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });
  const planetscale = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 잠재적 문제 1: 에러 발생 시 조용히 실패
    console.log('\n[1] 잠재적 문제: 에러 발생 시 조용히 실패 (Line 368-370)');
    console.log('-'.repeat(80));
    console.log('코드:');
    console.log('  } catch (error) {');
    console.log('    console.error(`❌ [포인트 회수] 실패 (user_id=${userId}):`, error);');
    console.log('    return 0;  // ⚠️ 에러를 throw하지 않고 0 반환');
    console.log('  }');
    console.log('');
    console.log('문제:');
    console.log('  - 에러가 발생해도 환불은 계속 진행됨');
    console.log('  - 고객은 환불받았지만 포인트는 회수 안됨');
    console.log('  - 로그만 남고 관리자가 수동으로 확인해야 함');

    // 2. 잠재적 문제 2: Neon vs PlanetScale 동기화 실패
    console.log('\n[2] 잠재적 문제: Dual DB 동기화 실패 (Line 322-366)');
    console.log('-'.repeat(80));
    console.log('시나리오:');
    console.log('  1. Neon 트랜잭션 시작 (BEGIN)');
    console.log('  2. Neon users.total_points 업데이트 성공');
    console.log('  3. PlanetScale user_points INSERT 성공');
    console.log('  4. Neon COMMIT 실행');
    console.log('  5. ❌ COMMIT 실패 → 롤백 → Neon은 원상복구');
    console.log('  6. ✅ PlanetScale은 이미 INSERT됨 (롤백 불가)');
    console.log('');
    console.log('결과:');
    console.log('  - Neon: 포인트 차감 안됨');
    console.log('  - PlanetScale: 회수 내역은 있음');
    console.log('  - 불일치 발생!');

    // 3. 실제 불일치 확인
    console.log('\n[3] 실제 Neon vs PlanetScale 불일치 확인');
    console.log('-'.repeat(80));

    const users = await neon.query('SELECT id FROM users WHERE id = 11');

    for (const user of users.rows) {
      const userId = user.id;

      // Neon 포인트
      const neonResult = await neon.query('SELECT total_points FROM users WHERE id = $1', [userId]);
      const neonPoints = neonResult.rows[0]?.total_points || 0;

      // PlanetScale 포인트
      const planetscaleResult = await planetscale.execute(`
        SELECT balance_after
        FROM user_points
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `, [userId]);
      const planetscalePoints = planetscaleResult.rows?.[0]?.balance_after || 0;

      console.log(`user_id=${userId}:`);
      console.log(`  Neon total_points: ${neonPoints}P`);
      console.log(`  PlanetScale balance_after: ${planetscalePoints}P`);

      if (neonPoints !== planetscalePoints) {
        console.log(`  ⚠️  불일치 발견! 차이: ${Math.abs(neonPoints - planetscalePoints)}P`);

        // 불일치 원인 분석
        const lastRefund = await planetscale.execute(`
          SELECT id, points, created_at, reason
          FROM user_points
          WHERE user_id = ? AND point_type = 'refund' AND points < 0
          ORDER BY created_at DESC
          LIMIT 1
        `, [userId]);

        if (lastRefund.rows && lastRefund.rows.length > 0) {
          console.log(`  마지막 환불: ${lastRefund.rows[0].points}P at ${lastRefund.rows[0].created_at}`);
          console.log(`  원인: Neon COMMIT 실패 또는 네트워크 오류 가능성`);
        }
      } else {
        console.log(`  ✅ 동기화 정상`);
      }
    }

    // 4. 장바구니 주문 환불 케이스
    console.log('\n[4] 장바구니 주문 환불 처리');
    console.log('-'.repeat(80));
    console.log('코드 분석 (refund.js Line 591-609):');
    console.log('  const isCartOrder = payment.order_number && payment.order_number.startsWith(\'ORDER_\');');
    console.log('');
    console.log('  if (isCartOrder) {');
    console.log('    // 모든 bookings 조회');
    console.log('    const bookingsResult = await connection.execute(`');
    console.log('      SELECT id FROM bookings WHERE order_number = ?');
    console.log('    `, [payment.order_number]);');
    console.log('  }');
    console.log('');
    console.log('  // Line 673-676: 포인트 회수');
    console.log('  const refundOrderId = String(payment.id);');
    console.log('  const deductedPoints = await deductEarnedPoints(connection, payment.user_id, refundOrderId);');
    console.log('');
    console.log('잠재적 문제:');
    console.log('  - 장바구니 주문은 여러 카테고리 payment가 생성됨 (confirm.js Line 700-732)');
    console.log('  - 각 카테고리마다 개별 payment_id로 포인트 적립');
    console.log('  - 환불 시 현재 payment.id만 회수 → 다른 카테고리 포인트는?');
    console.log('');
    console.log('확인 필요:');
    console.log('  - 장바구니 환불 시 모든 카테고리 payment_id를 순회하며 포인트 회수해야 함');

    // 5. 장바구니 주문 포인트 적립 확인
    console.log('\n[5] 장바구니 주문 포인트 적립 구조 확인');
    console.log('-'.repeat(80));

    const cartOrders = await planetscale.execute(`
      SELECT DISTINCT p.gateway_transaction_id as order_number
      FROM payments p
      WHERE p.gateway_transaction_id LIKE 'ORDER_%'
        AND p.payment_status = 'paid'
      ORDER BY p.created_at DESC
      LIMIT 3
    `);

    if (cartOrders.rows && cartOrders.rows.length > 0) {
      for (const order of cartOrders.rows) {
        console.log(`\n  주문번호: ${order.order_number}`);

        // 이 주문의 모든 카테고리 payments
        const payments = await planetscale.execute(`
          SELECT id, amount, notes
          FROM payments
          WHERE gateway_transaction_id = ?
          ORDER BY id ASC
        `, [order.order_number]);

        console.log(`  카테고리 수: ${payments.rows?.length || 0}개`);

        if (payments.rows) {
          let totalEarned = 0;
          for (const payment of payments.rows) {
            // 각 payment_id로 적립된 포인트
            const earned = await planetscale.execute(`
              SELECT SUM(points) as total
              FROM user_points
              WHERE related_order_id = ? AND point_type = 'earn' AND points > 0
            `, [String(payment.id)]);

            const points = earned.rows?.[0]?.total || 0;
            totalEarned += parseInt(points || 0);

            if (points > 0) {
              console.log(`    payment_id=${payment.id}: ${points}P 적립`);
            }
          }

          console.log(`  총 적립: ${totalEarned}P`);

          if (totalEarned > 0) {
            console.log(`  ⚠️  환불 시 모든 payment_id를 순회하며 회수해야 함!`);
          }
        }
      }
    }

    // 6. 결론
    console.log('\n' + '='.repeat(80));
    console.log('발견된 잠재적 문제점');
    console.log('='.repeat(80));
    console.log('');
    console.log('[문제 1] 에러 발생 시 조용히 실패');
    console.log('  - 파일: api/payments/refund.js:368-370');
    console.log('  - 문제: catch에서 0을 반환하여 환불은 성공하지만 포인트는 회수 안됨');
    console.log('  - 영향: 고객에게 유리, 회사에 손실');
    console.log('  - 해결: 에러를 throw하거나 관리자 알림 필요');
    console.log('');
    console.log('[문제 2] Dual DB 동기화 실패 가능성');
    console.log('  - 파일: api/payments/refund.js:342-349');
    console.log('  - 문제: PlanetScale INSERT 후 Neon COMMIT 실패 시 불일치');
    console.log('  - 영향: Neon은 롤백되지만 PlanetScale은 유지됨');
    console.log('  - 해결: 트랜잭션 순서 변경 필요 (Neon 먼저 COMMIT, PlanetScale 나중)');
    console.log('');
    console.log('[문제 3] 장바구니 주문 환불 시 일부 포인트만 회수');
    console.log('  - 파일: api/payments/refund.js:669-676');
    console.log('  - 문제: 첫 번째 payment.id만 사용, 다른 카테고리 포인트는 회수 안됨');
    console.log('  - 영향: 장바구니 환불 시 포인트 일부만 회수됨');
    console.log('  - 해결: 모든 카테고리 payment를 순회하며 포인트 회수 필요');

  } catch (error) {
    console.error('❌ 분석 실패:', error);
  } finally {
    await neon.end();
  }
}

deepAnalysis();
