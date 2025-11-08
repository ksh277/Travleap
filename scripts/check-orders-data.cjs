require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('=== 1️⃣ DB 데이터 확인 ===\n');

  // payments 테이블 확인
  const payments = await conn.execute(`
    SELECT COUNT(*) as count FROM payments
    WHERE payment_status IN ('paid', 'completed', 'refunded')
  `);
  console.log('📊 payments 테이블:', payments.rows[0].count, '건');

  // rentcar_bookings 테이블 확인
  const rentcar = await conn.execute(`
    SELECT COUNT(*) as count FROM rentcar_bookings
    WHERE payment_status IN ('paid', 'completed', 'refunded')
  `);
  console.log('📊 rentcar_bookings 테이블:', rentcar.rows[0].count, '건');

  // 총합
  const total = parseInt(payments.rows[0].count) + parseInt(rentcar.rows[0].count);
  console.log('📊 총 주문:', total, '건');

  // 샘플 데이터
  const sample = await conn.execute(`
    SELECT id, user_id, amount, payment_status, created_at
    FROM payments
    WHERE payment_status IN ('paid', 'completed', 'refunded')
    ORDER BY created_at DESC
    LIMIT 5
  `);
  console.log('\n📋 최근 주문 5건:');
  sample.rows.forEach(r => {
    console.log(`  - ID ${r.id}: ${r.amount}원, ${r.payment_status}, ${r.created_at}`);
  });

  process.exit(0);
})();
