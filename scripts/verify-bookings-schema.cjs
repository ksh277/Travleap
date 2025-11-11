/**
 * bookings 테이블 스키마 상세 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 bookings 테이블 스키마 확인 중...\n');

    const result = await connection.execute(`DESCRIBE bookings`);

    console.log('✅ bookings 테이블 컬럼 목록:\n');
    const columns = result.rows.map(r => r.Field);

    result.rows.forEach((col, index) => {
      console.log(`[${index + 1}] ${col.Field}`);
      console.log(`    Type: ${col.Type}`);
      console.log(`    Null: ${col.Null}`);
      console.log(`    Key: ${col.Key || 'N/A'}`);
      console.log(`    Default: ${col.Default || 'N/A'}`);
      console.log();
    });

    // 필수 컬럼 체크
    const requiredCols = [
      'booking_number',
      'listing_id',
      'user_id',
      'status',
      'payment_status',
      'total_amount',
      'updated_at'
    ];

    console.log('\n=== 필수 컬럼 존재 여부 ===');
    requiredCols.forEach(col => {
      const exists = columns.includes(col);
      console.log(`${exists ? '✅' : '❌'} ${col}`);
    });

    // 예약 번호 형식 확인
    console.log('\n=== 기존 예약 번호 형식 확인 ===');
    const bookingResult = await connection.execute(`
      SELECT booking_number, status, payment_status, created_at
      FROM bookings
      ORDER BY created_at DESC
      LIMIT 20
    `);

    if (bookingResult.rows && bookingResult.rows.length > 0) {
      const formats = {};
      bookingResult.rows.forEach(row => {
        const prefix = row.booking_number.split('-')[0] + '-';
        formats[prefix] = (formats[prefix] || 0) + 1;
      });

      console.log('\n발견된 예약 번호 형식:');
      Object.entries(formats).forEach(([prefix, count]) => {
        console.log(`  ${prefix}: ${count}건`);
      });

      console.log('\n최근 예약 샘플:');
      bookingResult.rows.slice(0, 5).forEach((row, i) => {
        console.log(`  [${i + 1}] ${row.booking_number} (${row.status}/${row.payment_status})`);
      });
    } else {
      console.log('예약 데이터 없음');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
