/**
 * tour_bookings와 event_tickets 테이블 스키마 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 tour_bookings 테이블 확인 중...\n');

    try {
      const tourResult = await connection.execute(`DESCRIBE tour_bookings`);
      console.log('✅ tour_bookings 테이블 컬럼 목록:\n');
      tourResult.rows.forEach((col, index) => {
        console.log(`[${index + 1}] ${col.Field} (${col.Type})`);
      });

      // 필요한 컬럼 체크
      const requiredCols = ['booking_number', 'user_id', 'status', 'payment_status', 'total_price_krw', 'updated_at'];
      const existingCols = tourResult.rows.map(r => r.Field);
      const missingCols = requiredCols.filter(col => !existingCols.includes(col));

      if (missingCols.length > 0) {
        console.log('\n⚠️ 누락된 필수 컬럼:', missingCols.join(', '));
      } else {
        console.log('\n✅ 모든 필수 컬럼 존재');
      }

    } catch (error) {
      console.error('❌ tour_bookings 테이블 없음 또는 오류:', error.message);
    }

    console.log('\n========================================\n');
    console.log('📊 event_tickets 테이블 확인 중...\n');

    try {
      const eventResult = await connection.execute(`DESCRIBE event_tickets`);
      console.log('✅ event_tickets 테이블 컬럼 목록:\n');
      eventResult.rows.forEach((col, index) => {
        console.log(`[${index + 1}] ${col.Field} (${col.Type})`);
      });

      // 필요한 컬럼 체크
      const requiredCols = ['ticket_number', 'user_id', 'status', 'payment_status', 'total_amount', 'updated_at'];
      const existingCols = eventResult.rows.map(r => r.Field);
      const missingCols = requiredCols.filter(col => !existingCols.includes(col));

      if (missingCols.length > 0) {
        console.log('\n⚠️ 누락된 필수 컬럼:', missingCols.join(', '));
      } else {
        console.log('\n✅ 모든 필수 컬럼 존재');
      }

    } catch (error) {
      console.error('❌ event_tickets 테이블 없음 또는 오류:', error.message);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
