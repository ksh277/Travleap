/**
 * 전체 결제 타입 분석 및 포인트 적립 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkAllPaymentTypes() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('💳 전체 결제 타입 분석 중...\n');

  // payments 테이블의 모든 order_id_str 패턴 확인
  const patterns = await conn.execute(`
    SELECT
      CASE
        WHEN order_id_str LIKE 'BK-%' THEN 'BK- (일반 예약)'
        WHEN order_id_str LIKE 'RC%' THEN 'RC (렌트카)'
        WHEN order_id_str LIKE 'ORDER_%' THEN 'ORDER_ (장바구니)'
        WHEN order_id_str LIKE 'LG-%' THEN 'LG- (숙박)'
        ELSE 'OTHER'
      END as pattern,
      COUNT(*) as cnt,
      SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_cnt
    FROM payments
    WHERE order_id_str IS NOT NULL
    GROUP BY pattern
    ORDER BY cnt DESC
  `);

  console.log('📊 payments 테이블의 order_id_str 패턴:');
  patterns.rows.forEach(row => {
    console.log('  - ' + row.pattern + ': 총 ' + row.cnt + '개 (paid: ' + row.paid_cnt + '개)');
  });

  // 각 타입별 샘플 데이터
  console.log('\n📝 각 타입별 샘플 데이터:\n');

  const bkSample = await conn.execute('SELECT order_id_str, amount, payment_status, notes FROM payments WHERE order_id_str LIKE "BK-%" ORDER BY created_at DESC LIMIT 3');
  console.log('🔹 BK- (일반 예약):');
  bkSample.rows.forEach(row => {
    let notes = {};
    try {
      notes = row.notes ? JSON.parse(row.notes) : {};
    } catch (e) {}
    console.log('  - ' + row.order_id_str + ' | ' + row.amount + '원 | ' + row.payment_status + ' | category: ' + (notes.category || '없음'));
  });

  const rcSample = await conn.execute('SELECT order_id_str, amount, payment_status, notes FROM payments WHERE order_id_str LIKE "RC%" ORDER BY created_at DESC LIMIT 3');
  console.log('\n🔹 RC (렌트카):');
  rcSample.rows.forEach(row => {
    let notes = {};
    try {
      notes = row.notes ? JSON.parse(row.notes) : {};
    } catch (e) {}
    console.log('  - ' + row.order_id_str + ' | ' + row.amount + '원 | ' + row.payment_status + ' | category: ' + (notes.category || '없음'));
  });

  const orderSample = await conn.execute('SELECT order_id_str, amount, payment_status, notes FROM payments WHERE order_id_str LIKE "ORDER_%" ORDER BY created_at DESC LIMIT 3');
  console.log('\n🔹 ORDER_ (장바구니):');
  orderSample.rows.forEach(row => {
    let notes = {};
    try {
      notes = row.notes ? JSON.parse(row.notes) : {};
    } catch (e) {}
    console.log('  - ' + row.order_id_str + ' | ' + row.amount + '원 | ' + row.payment_status + ' | category: ' + (notes.category || '없음'));
  });

  // 포인트 적립 확인
  console.log('\n\n💰 포인트 적립 현황 확인:\n');

  const pointsEarned = await conn.execute(`
    SELECT
      reason,
      COUNT(*) as cnt,
      SUM(points) as total_points
    FROM user_points
    WHERE point_type = 'earn'
    GROUP BY reason
    ORDER BY cnt DESC
    LIMIT 10
  `);

  console.log('📈 적립 내역:');
  pointsEarned.rows.forEach(row => {
    console.log('  - ' + row.reason + ': ' + row.cnt + '건, 총 ' + row.total_points + 'P');
  });

  // 포인트 적립 안 된 결제 찾기
  console.log('\n\n⚠️  포인트 적립 안 된 paid 결제 확인:\n');

  const unpointedPayments = await conn.execute(`
    SELECT p.id, p.order_id_str, p.amount, p.payment_status, p.created_at
    FROM payments p
    LEFT JOIN user_points up ON up.related_order_id = CAST(p.id AS CHAR)
    WHERE p.payment_status = 'paid'
      AND up.id IS NULL
      AND p.amount > 0
    ORDER BY p.created_at DESC
    LIMIT 10
  `);

  if (unpointedPayments.rows.length > 0) {
    console.log('❌ 포인트가 적립되지 않은 결제 ' + unpointedPayments.rows.length + '건 발견:');
    unpointedPayments.rows.forEach(row => {
      console.log('  - payment_id: ' + row.id + ' | ' + row.order_id_str + ' | ' + row.amount + '원 | ' + row.created_at);
    });
  } else {
    console.log('✅ 모든 paid 결제에 포인트가 적립되었습니다!');
  }
}

checkAllPaymentTypes().catch(console.error);
