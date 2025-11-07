const mysql = require('mysql2/promise');
require('dotenv').config();

async function analyzeAdminOrdersFull() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: { rejectUnauthorized: true }
    });

    console.log('✅ Connected to PlanetScale\n');

    // 1. payments 테이블 전체 현황
    console.log('📊 1. Payments 테이블 전체 현황:');
    const [paymentsTotal] = await connection.execute(`
      SELECT
        COUNT(*) as total_count,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(amount) as total_amount,
        MIN(created_at) as earliest_payment,
        MAX(created_at) as latest_payment
      FROM payments
    `);
    console.table(paymentsTotal);

    // 2. payment_status별 분포
    console.log('\n📊 2. Payment Status 분포:');
    const [statusDist] = await connection.execute(`
      SELECT
        payment_status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM payments
      GROUP BY payment_status
      ORDER BY count DESC
    `);
    console.table(statusDist);

    // 3. booking_id 유무에 따른 분포
    console.log('\n📊 3. Booking ID 연결 상태:');
    const [bookingLink] = await connection.execute(`
      SELECT
        CASE
          WHEN booking_id IS NULL THEN 'NULL (장바구니)'
          ELSE 'Has booking_id'
        END as has_booking,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT payment_status) as statuses
      FROM payments
      GROUP BY has_booking
    `);
    console.table(bookingLink);

    // 4. 현재 API 쿼리로 가져오는 주문 수
    console.log('\n📊 4. 현재 API 쿼리 결과 (pending, paid, completed, refunded):');
    const [currentQuery] = await connection.execute(`
      SELECT
        COUNT(*) as matched_count,
        SUM(amount) as matched_amount
      FROM payments p
      WHERE p.payment_status IN ('pending', 'paid', 'completed', 'refunded')
    `);
    console.table(currentQuery);

    // 5. API에서 누락되는 주문 (다른 status)
    console.log('\n📊 5. API에서 누락되는 주문들:');
    const [missedOrders] = await connection.execute(`
      SELECT
        payment_status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        GROUP_CONCAT(id ORDER BY id DESC LIMIT 5) as sample_ids
      FROM payments
      WHERE payment_status NOT IN ('pending', 'paid', 'completed', 'refunded')
      GROUP BY payment_status
    `);
    console.table(missedOrders);

    // 6. bookings 테이블 전체 현황
    console.log('\n📊 6. Bookings 테이블 전체 현황:');
    const [bookingsTotal] = await connection.execute(`
      SELECT
        COUNT(*) as total_bookings,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT listing_id) as unique_listings,
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM bookings
    `);
    console.table(bookingsTotal);

    // 7. bookings의 status 분포
    console.log('\n📊 7. Bookings Status 분포:');
    const [bookingStatus] = await connection.execute(`
      SELECT
        status,
        payment_status,
        COUNT(*) as count
      FROM bookings
      GROUP BY status, payment_status
      ORDER BY count DESC
    `);
    console.table(bookingStatus);

    // 8. payments와 bookings의 연결 상태
    console.log('\n📊 8. Payments-Bookings 연결 분석:');
    const [linkAnalysis] = await connection.execute(`
      SELECT
        'Payments with valid booking_id' as category,
        COUNT(*) as count
      FROM payments p
      WHERE p.booking_id IS NOT NULL

      UNION ALL

      SELECT
        'Payments with NULL booking_id' as category,
        COUNT(*) as count
      FROM payments p
      WHERE p.booking_id IS NULL

      UNION ALL

      SELECT
        'Bookings linked to payments' as category,
        COUNT(DISTINCT b.id) as count
      FROM bookings b
      INNER JOIN payments p ON p.booking_id = b.id

      UNION ALL

      SELECT
        'Bookings NOT linked to payments' as category,
        COUNT(*) as count
      FROM bookings b
      WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.id)
    `);
    console.table(linkAnalysis);

    // 9. 최근 10개 payments 샘플
    console.log('\n📋 9. 최근 10개 Payments 샘플:');
    const [recentPayments] = await connection.execute(`
      SELECT
        p.id,
        p.user_id,
        p.amount,
        p.payment_status,
        p.booking_id,
        SUBSTRING(p.notes, 1, 50) as notes_preview,
        p.created_at
      FROM payments p
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    console.table(recentPayments);

    // 10. gateway_transaction_id 유무
    console.log('\n📊 10. Gateway Transaction ID 상태:');
    const [gatewayAnalysis] = await connection.execute(`
      SELECT
        CASE
          WHEN gateway_transaction_id IS NULL THEN 'NULL'
          WHEN gateway_transaction_id = '' THEN 'EMPTY'
          ELSE 'Has ID'
        END as gateway_status,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT payment_status) as statuses
      FROM payments
      GROUP BY gateway_status
    `);
    console.table(gatewayAnalysis);

    // 11. 중복 확인 - 같은 order_number
    console.log('\n📊 11. Order Number 중복 확인:');
    const [duplicates] = await connection.execute(`
      SELECT
        gateway_transaction_id,
        COUNT(*) as count,
        GROUP_CONCAT(id) as payment_ids,
        GROUP_CONCAT(DISTINCT payment_status) as statuses
      FROM payments
      WHERE gateway_transaction_id IS NOT NULL
      GROUP BY gateway_transaction_id
      HAVING COUNT(*) > 1
      LIMIT 10
    `);
    if (duplicates.length > 0) {
      console.log('⚠️ 중복된 주문번호 발견:');
      console.table(duplicates);
    } else {
      console.log('✅ 중복된 주문번호 없음');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

analyzeAdminOrdersFull()
  .then(() => {
    console.log('\n✅ 분석 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 분석 실패:', error);
    process.exit(1);
  });
