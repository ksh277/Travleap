require('dotenv').config();
const { connect } = require('@planetscale/database');

async function deleteTestBookings() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🗑️ 렌트카 테스트 예약 데이터 삭제 시작...\n');

  try {
    // 1. 현재 예약 데이터 확인
    console.log('=== 삭제 전 데이터 ===\n');

    const bookingsResult = await connection.execute(`
      SELECT *
      FROM rentcar_bookings
      ORDER BY created_at DESC
    `);

    console.log(`렌트카 예약: ${bookingsResult.rows?.length || 0}건`);
    (bookingsResult.rows || []).forEach(booking => {
      const price = booking.total_price || booking.total_amount || booking.amount || 0;
      console.log(`  ID ${booking.id}: ${booking.booking_number} - ₩${price} (${booking.payment_status})`);
    });

    // payments 테이블에서 렌트카 관련 찾기 (category 필드 사용)
    let paymentsResult = null;
    try {
      paymentsResult = await connection.execute(`
        SELECT id, gateway_transaction_id, amount, payment_status, created_at
        FROM payments
        WHERE category = 'rentcar' OR category = '렌트카'
        ORDER BY created_at DESC
      `);

      console.log(`\n렌트카 관련 payments: ${paymentsResult.rows?.length || 0}건`);
      (paymentsResult.rows || []).forEach(payment => {
        console.log(`  ID ${payment.id}: ${payment.gateway_transaction_id} - ₩${payment.amount} (${payment.payment_status})`);
      });
    } catch (e) {
      console.log(`\n⚠️ payments 테이블에서 렌트카 관련 데이터를 찾을 수 없습니다.`);
      paymentsResult = { rows: [] };
    }

    // 2. 삭제 확인 메시지
    const totalToDelete = (bookingsResult.rows?.length || 0) + (paymentsResult.rows?.length || 0);

    if (totalToDelete === 0) {
      console.log('\n✅ 삭제할 데이터가 없습니다.');
      return;
    }

    console.log(`\n⚠️ 총 ${totalToDelete}건의 데이터를 삭제합니다.`);

    // 3. rentcar_bookings 삭제
    if (bookingsResult.rows && bookingsResult.rows.length > 0) {
      const deleteBookingsResult = await connection.execute(`
        DELETE FROM rentcar_bookings
        WHERE id > 0
      `);

      console.log(`\n✅ rentcar_bookings 삭제: ${bookingsResult.rows.length}건`);
    }

    // 4. payments 테이블에서 렌트카 관련 삭제
    if (paymentsResult.rows && paymentsResult.rows.length > 0) {
      try {
        const deletePaymentsResult = await connection.execute(`
          DELETE FROM payments
          WHERE category = 'rentcar' OR category = '렌트카'
        `);

        console.log(`✅ payments (렌트카 관련) 삭제: ${paymentsResult.rows.length}건`);
      } catch (e) {
        console.log(`⚠️ payments 삭제 스킵 (category 컬럼 없음)`);
      }
    }

    // 5. 삭제 후 확인
    console.log('\n=== 삭제 후 확인 ===\n');

    const afterBookings = await connection.execute(`
      SELECT COUNT(*) as count FROM rentcar_bookings
    `);
    console.log(`남은 rentcar_bookings: ${afterBookings.rows?.[0]?.count || 0}건`);

    try {
      const afterPayments = await connection.execute(`
        SELECT COUNT(*) as count FROM payments
        WHERE category = 'rentcar' OR category = '렌트카'
      `);
      console.log(`남은 payments (렌트카): ${afterPayments.rows?.[0]?.count || 0}건`);
    } catch (e) {
      console.log(`payments (렌트카): 확인 불가 (category 컬럼 없음)`);
    }

    console.log('\n✅ 테스트 데이터 삭제 완료!');

  } catch (error) {
    console.error('❌ 삭제 실패:', error);
    throw error;
  }
}

deleteTestBookings()
  .then(() => {
    console.log('\n🎉 작업 완료!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 작업 실패:', err);
    process.exit(1);
  });
