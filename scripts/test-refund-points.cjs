/**
 * 환불 시 포인트 회수 테스트 스크립트
 *
 * 테스트 시나리오:
 * 1. payment_id로 적립된 포인트 조회
 * 2. 환불 시 포인트 회수 로직 검증
 * 3. Neon vs PlanetScale 동기화 확인
 */

const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');

// 환경 변수 로드
require('dotenv').config();

async function testRefundPoints() {
  console.log('='.repeat(80));
  console.log('환불 시 포인트 회수 테스트');
  console.log('='.repeat(80));

  // 데이터베이스 연결
  const neon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });
  const planetscale = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 최근 결제 정보 조회 (payment_id: 67)
    console.log('\n[1] 최근 결제 정보 조회');
    console.log('-'.repeat(80));

    const paymentResult = await planetscale.execute(`
      SELECT id, user_id, amount, payment_status, notes, created_at
      FROM payments
      WHERE id = 67
    `);

    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      console.log('❌ payment_id=67을 찾을 수 없습니다.');
      return;
    }

    const payment = paymentResult.rows[0];
    console.log('Payment 정보:');
    console.log(`  - payment_id: ${payment.id}`);
    console.log(`  - user_id: ${payment.user_id}`);
    console.log(`  - amount: ${payment.amount}원`);
    console.log(`  - status: ${payment.payment_status}`);
    console.log(`  - created_at: ${payment.created_at}`);

    // 2. 해당 payment_id로 적립된 포인트 조회
    console.log('\n[2] 적립된 포인트 조회 (related_order_id = payment_id)');
    console.log('-'.repeat(80));

    const earnedPointsResult = await planetscale.execute(`
      SELECT id, points, point_type, reason, related_order_id, balance_after, created_at
      FROM user_points
      WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn' AND points > 0
      ORDER BY created_at DESC
    `, [payment.user_id, String(payment.id)]);

    console.log(`조회된 적립 내역: ${earnedPointsResult.rows?.length || 0}건`);

    if (earnedPointsResult.rows && earnedPointsResult.rows.length > 0) {
      earnedPointsResult.rows.forEach((row, idx) => {
        console.log(`\n  [${idx + 1}] ID: ${row.id}`);
        console.log(`      points: ${row.points}P`);
        console.log(`      related_order_id: ${row.related_order_id}`);
        console.log(`      balance_after: ${row.balance_after}P`);
        console.log(`      reason: ${row.reason}`);
        console.log(`      created_at: ${row.created_at}`);
      });

      const totalPoints = earnedPointsResult.rows.reduce((sum, row) => sum + (row.points || 0), 0);
      console.log(`\n  총 적립 포인트: ${totalPoints}P`);
    } else {
      console.log('  ⚠️  적립된 포인트가 없습니다!');
    }

    // 3. 환불 시 회수될 포인트 시뮬레이션
    console.log('\n[3] 환불 시 포인트 회수 시뮬레이션');
    console.log('-'.repeat(80));

    // deductEarnedPoints 함수 로직 재현
    const refundOrderId = String(payment.id); // payment_id를 문자열로 변환

    console.log(`환불 시 사용할 related_order_id: "${refundOrderId}"`);
    console.log(`조회 쿼리: WHERE user_id = ${payment.user_id} AND related_order_id = '${refundOrderId}' AND point_type = 'earn' AND points > 0`);

    // 정확한 매칭 시도
    let testQuery1 = await planetscale.execute(`
      SELECT points, id, related_order_id
      FROM user_points
      WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn' AND points > 0
      ORDER BY created_at DESC
    `, [payment.user_id, refundOrderId]);

    console.log(`\n정확한 매칭 결과: ${testQuery1.rows?.length || 0}건`);

    if (!testQuery1.rows || testQuery1.rows.length === 0) {
      console.log('❌ 정확한 매칭 실패!');

      // LIKE 검색 시도
      const orderPattern = refundOrderId.replace(/^ORDER_/, '').split('_')[0];
      console.log(`\nLIKE 검색 시도... pattern: %${orderPattern}%`);

      let testQuery2 = await planetscale.execute(`
        SELECT points, id, related_order_id
        FROM user_points
        WHERE user_id = ?
          AND point_type = 'earn'
          AND points > 0
          AND related_order_id LIKE ?
        ORDER BY created_at DESC
        LIMIT 10
      `, [payment.user_id, `%${orderPattern}%`]);

      console.log(`LIKE 검색 결과: ${testQuery2.rows?.length || 0}건`);

      if (testQuery2.rows && testQuery2.rows.length > 0) {
        testQuery2.rows.forEach((row, idx) => {
          console.log(`  [${idx + 1}] related_order_id: ${row.related_order_id}, points: ${row.points}P`);
        });
      } else {
        console.log('❌ LIKE 검색도 실패!');
      }
    } else {
      console.log('✅ 정확한 매칭 성공!');
      testQuery1.rows.forEach((row, idx) => {
        console.log(`  [${idx + 1}] related_order_id: ${row.related_order_id}, points: ${row.points}P`);
      });

      const pointsToDeduct = testQuery1.rows.reduce((sum, row) => sum + (row.points || 0), 0);
      console.log(`\n  회수될 포인트: ${pointsToDeduct}P`);
    }

    // 4. 최근 적립 내역 디버그 (user_id 기준)
    console.log('\n[4] 최근 적립 내역 (디버그용)');
    console.log('-'.repeat(80));

    const debugResult = await planetscale.execute(`
      SELECT id, related_order_id, points, reason, created_at
      FROM user_points
      WHERE user_id = ? AND point_type = 'earn' AND points > 0
      ORDER BY created_at DESC
      LIMIT 10
    `, [payment.user_id]);

    console.log(`최근 적립 내역: ${debugResult.rows?.length || 0}건`);
    debugResult.rows?.forEach((row, idx) => {
      console.log(`  [${idx + 1}] related_order_id: ${row.related_order_id}, points: ${row.points}P`);
      console.log(`      reason: ${row.reason}`);
      console.log(`      created_at: ${row.created_at}`);
    });

    // 5. Neon vs PlanetScale 비교
    console.log('\n[5] Neon vs PlanetScale 포인트 비교');
    console.log('-'.repeat(80));

    const neonUser = await neon.query('SELECT total_points FROM users WHERE id = $1', [payment.user_id]);
    const neonPoints = neonUser.rows?.[0]?.total_points || 0;

    const planetscaleLatest = await planetscale.execute(`
      SELECT balance_after
      FROM user_points
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `, [payment.user_id]);
    const planetscalePoints = planetscaleLatest.rows?.[0]?.balance_after || 0;

    console.log(`Neon total_points: ${neonPoints}P`);
    console.log(`PlanetScale balance_after: ${planetscalePoints}P`);
    console.log(`차이: ${Math.abs(neonPoints - planetscalePoints)}P`);

    if (neonPoints === planetscalePoints) {
      console.log('✅ 동기화 정상');
    } else {
      console.log('⚠️  동기화 문제 발견!');
    }

    // 6. 결론
    console.log('\n' + '='.repeat(80));
    console.log('테스트 결과 요약');
    console.log('='.repeat(80));

    if (earnedPointsResult.rows && earnedPointsResult.rows.length > 0) {
      console.log('✅ 포인트 적립: 정상');
      console.log(`   - payment_id=${payment.id}로 적립된 포인트: ${earnedPointsResult.rows.reduce((sum, row) => sum + (row.points || 0), 0)}P`);
    } else {
      console.log('❌ 포인트 적립: 실패 또는 없음');
    }

    if (testQuery1.rows && testQuery1.rows.length > 0) {
      console.log('✅ 포인트 회수: 정상 작동 예상');
      console.log(`   - 환불 시 회수될 포인트: ${testQuery1.rows.reduce((sum, row) => sum + (row.points || 0), 0)}P`);
    } else {
      console.log('❌ 포인트 회수: 실패 예상');
      console.log('   - related_order_id 매칭 실패');
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  } finally {
    await neon.end();
  }
}

// 실행
testRefundPoints();
