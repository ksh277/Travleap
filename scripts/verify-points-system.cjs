/**
 * 전체 포인트 시스템 검증
 *
 * 검증 내용:
 * 1. 모든 paid 결제에 포인트가 적립되었는지
 * 2. 포인트 적립률이 2%가 맞는지
 * 3. 환불된 결제의 포인트가 회수되었는지
 * 4. 각 카테고리별 포인트 적립 현황
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function verifyPointsSystem() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('💰 포인트 시스템 전체 검증 시작...\n');

  try {
    // 1. 모든 paid 결제에 포인트가 적립되었는지 확인
    console.log('=' .repeat(60));
    console.log('1️⃣  모든 paid 결제에 포인트 적립 확인');
    console.log('=' .repeat(60) + '\n');

    // BK-*, RC*, ORDER_ 패턴별로 확인
    const patterns = [
      { name: 'BK- (일반 예약)', pattern: 'BK-%' },
      { name: 'RC (렌트카)', pattern: 'RC%' },
      { name: 'ORDER_ (장바구니)', pattern: 'ORDER_%' }
    ];

    for (const { name, pattern } of patterns) {
      console.log(`\n📊 ${name}:`);

      // paid 결제 중 포인트 적립 안된 것 찾기
      const unpointedPayments = await conn.execute(`
        SELECT p.id, p.order_id_str, p.amount, p.created_at, p.notes
        FROM payments p
        LEFT JOIN user_points up ON up.related_order_id = CONVERT(p.id, CHAR) COLLATE utf8mb4_unicode_ci AND up.point_type = 'earn'
        WHERE p.payment_status = 'paid'
          AND p.order_id_str LIKE ?
          AND p.amount > 0
          AND up.id IS NULL
        ORDER BY p.created_at DESC
        LIMIT 10
      `, [pattern]);

      if (unpointedPayments.rows.length > 0) {
        console.log(`  ❌ 포인트 적립 안된 paid 결제: ${unpointedPayments.rows.length}건`);
        unpointedPayments.rows.forEach(row => {
          let category = '알 수 없음';
          try {
            const notes = row.notes ? JSON.parse(row.notes) : {};
            category = notes.category || category;
          } catch (e) {}
          console.log(`     - payment_id: ${row.id} | ${row.order_id_str} | ${row.amount}원 | ${category}`);
        });
      } else {
        console.log(`  ✅ 모든 paid 결제에 포인트 적립됨`);
      }

      // 총 paid 결제 수
      const totalPaid = await conn.execute(`
        SELECT COUNT(*) as cnt
        FROM payments
        WHERE payment_status = 'paid' AND order_id_str LIKE ? AND amount > 0
      `, [pattern]);
      console.log(`  📈 총 paid 결제: ${totalPaid.rows[0].cnt}건`);
    }

    // 2. 포인트 적립률 검증 (2% 맞는지)
    console.log('\n\n' + '='.repeat(60));
    console.log('2️⃣  포인트 적립률 검증 (2% 확인)');
    console.log('='.repeat(60) + '\n');

    // 샘플 10개 결제의 적립률 확인
    const samplePayments = await conn.execute(`
      SELECT
        p.id as payment_id,
        p.order_id_str,
        p.amount,
        p.notes,
        up.points as earned_points,
        up.reason
      FROM payments p
      INNER JOIN user_points up ON up.related_order_id = CONVERT(p.id, CHAR) COLLATE utf8mb4_unicode_ci AND up.point_type = 'earn'
      WHERE p.payment_status = 'paid' AND p.amount > 0
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    console.log('최근 10건 결제의 포인트 적립률 확인:\n');

    let correctCount = 0;
    let incorrectCount = 0;

    for (const row of samplePayments.rows) {
      let notes = {};
      try {
        notes = row.notes ? JSON.parse(row.notes) : {};
      } catch (e) {}

      const category = notes.category || '알 수 없음';
      let expectedAmount = 0;

      // ORDER_인 경우 subtotal 사용, 아니면 amount - shipping_fee
      if (row.order_id_str && row.order_id_str.startsWith('ORDER_')) {
        expectedAmount = notes.subtotal || 0;
      } else {
        // BK-*, RC* 는 confirm.js에서 이미 배송비 제외하고 적립
        // 여기서는 단순히 amount 기준 (이미 배송비 제외된 상태)
        expectedAmount = row.amount;
      }

      const expectedPoints = Math.floor(expectedAmount * 0.02);
      const actualPoints = row.earned_points || 0;
      const isCorrect = expectedPoints === actualPoints;

      if (isCorrect) {
        correctCount++;
        console.log(`  ✅ payment_id=${row.payment_id} | ${category} | ${row.amount}원 → ${actualPoints}P`);
      } else {
        incorrectCount++;
        console.log(`  ❌ payment_id=${row.payment_id} | ${category} | ${row.amount}원 → ${actualPoints}P (예상: ${expectedPoints}P)`);
      }
    }

    console.log(`\n📊 검증 결과: 정확 ${correctCount}건 / 오류 ${incorrectCount}건`);

    // 3. 환불된 결제의 포인트 회수 확인
    console.log('\n\n' + '='.repeat(60));
    console.log('3️⃣  환불된 결제의 포인트 회수 확인');
    console.log('='.repeat(60) + '\n');

    // refunded 결제에 대해 포인트 회수되었는지 확인
    const refundedPayments = await conn.execute(`
      SELECT p.id, p.order_id_str, p.amount, p.refunded_at
      FROM payments p
      WHERE p.payment_status = 'refunded'
      ORDER BY p.refunded_at DESC
      LIMIT 10
    `);

    console.log(`최근 환불된 결제 ${refundedPayments.rows.length}건 확인:\n`);

    for (const payment of refundedPayments.rows) {
      // 적립 내역 조회
      const earnPoints = await conn.execute(`
        SELECT points FROM user_points
        WHERE related_order_id = ? AND point_type = 'earn'
      `, [String(payment.id)]);

      // 회수 내역 조회
      const refundPoints = await conn.execute(`
        SELECT points FROM user_points
        WHERE related_order_id = ? AND point_type = 'refund'
      `, [String(payment.id)]);

      const earned = earnPoints.rows[0]?.points || 0;
      const deducted = refundPoints.rows[0]?.points || 0;

      if (earned === 0) {
        console.log(`  ℹ️  payment_id=${payment.id} | 적립 내역 없음`);
      } else if (Math.abs(earned + deducted) < 1) {
        console.log(`  ✅ payment_id=${payment.id} | 적립 ${earned}P → 회수 ${deducted}P`);
      } else {
        console.log(`  ❌ payment_id=${payment.id} | 적립 ${earned}P → 회수 ${deducted}P (불일치!)`);
      }
    }

    // 4. 각 카테고리별 포인트 적립 현황
    console.log('\n\n' + '='.repeat(60));
    console.log('4️⃣  각 카테고리별 포인트 적립 현황');
    console.log('='.repeat(60) + '\n');

    // 카테고리별 통계
    const categoryStats = await conn.execute(`
      SELECT
        CASE
          WHEN p.order_id_str LIKE 'BK-%' THEN 'BK- (일반 예약)'
          WHEN p.order_id_str LIKE 'RC%' THEN 'RC (렌트카)'
          WHEN p.order_id_str LIKE 'ORDER_%' THEN 'ORDER_ (장바구니)'
          ELSE 'OTHER'
        END as category,
        COUNT(*) as total_payments,
        SUM(p.amount) as total_amount,
        COUNT(up.id) as earned_count,
        COALESCE(SUM(up.points), 0) as total_points_earned
      FROM payments p
      LEFT JOIN user_points up ON up.related_order_id = CONVERT(p.id, CHAR) COLLATE utf8mb4_unicode_ci AND up.point_type = 'earn'
      WHERE p.payment_status = 'paid' AND p.amount > 0
      GROUP BY category
      ORDER BY total_payments DESC
    `);

    console.log('카테고리별 포인트 적립 통계:\n');
    categoryStats.rows.forEach(row => {
      const coverage = ((row.earned_count / row.total_payments) * 100).toFixed(1);
      const avgPoints = (row.total_points_earned / row.earned_count).toFixed(0);
      console.log(`📊 ${row.category}:`);
      console.log(`   - 총 결제: ${row.total_payments}건 (${row.total_amount.toLocaleString()}원)`);
      console.log(`   - 포인트 적립: ${row.earned_count}건 (${coverage}%)`);
      console.log(`   - 총 적립 포인트: ${row.total_points_earned.toLocaleString()}P (평균 ${avgPoints}P/건)\n`);
    });

    // 5. 최종 요약
    console.log('\n' + '='.repeat(60));
    console.log('📝 최종 요약');
    console.log('='.repeat(60) + '\n');

    const summary = await conn.execute(`
      SELECT
        COUNT(*) as total_earn_records,
        SUM(points) as total_earned,
        (SELECT COUNT(*) FROM user_points WHERE point_type = 'refund') as total_refund_records,
        (SELECT SUM(points) FROM user_points WHERE point_type = 'refund') as total_refunded
      FROM user_points
      WHERE point_type = 'earn'
    `);

    const summ = summary.rows[0];
    console.log(`✅ 총 적립 내역: ${summ.total_earn_records}건, ${summ.total_earned.toLocaleString()}P`);
    console.log(`🔄 총 회수 내역: ${summ.total_refund_records}건, ${summ.total_refunded?.toLocaleString() || 0}P`);
    console.log(`💰 순 적립: ${(summ.total_earned + (summ.total_refunded || 0)).toLocaleString()}P\n`);

    console.log('✅ 포인트 시스템 검증 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

verifyPointsSystem().catch(console.error);
