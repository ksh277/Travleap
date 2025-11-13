require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkPickupTime() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('예약 #19 픽업 시간 분석');
    console.log('═══════════════════════════════════════════════════════\n');

    // 예약 #19 상세 정보
    const [bookings] = await connection.execute(`
      SELECT
        id,
        booking_number,
        pickup_date,
        pickup_time,
        dropoff_date,
        dropoff_time,
        pickup_at_utc,
        return_at_utc,
        created_at
      FROM rentcar_bookings
      WHERE id = 19
    `);

    if (bookings.length === 0) {
      console.log('❌ 예약 #19를 찾을 수 없습니다.\n');
      return;
    }

    const booking = bookings[0];

    console.log('📋 예약 #19 시간 정보:');
    console.log('─'.repeat(80));
    console.log('pickup_date:', booking.pickup_date);
    console.log('pickup_time:', booking.pickup_time);
    console.log('dropoff_date:', booking.dropoff_date);
    console.log('dropoff_time:', booking.dropoff_time);
    console.log('pickup_at_utc:', booking.pickup_at_utc);
    console.log('return_at_utc:', booking.return_at_utc);
    console.log('created_at:', booking.created_at);

    console.log('\n🔍 픽업 시간 해석:');
    console.log('─'.repeat(80));

    if (booking.pickup_time) {
      console.log(`pickup_time: ${booking.pickup_time}`);
      console.log(`  - 타입: ${typeof booking.pickup_time}`);
      console.log(`  - 값: "${booking.pickup_time}"`);

      // 시간을 파싱해서 표시
      const timeStr = booking.pickup_time.toString();
      console.log(`  - 문자열로 변환: "${timeStr}"`);
    }

    if (booking.pickup_at_utc) {
      console.log(`\npickup_at_utc: ${booking.pickup_at_utc}`);
      const utcDate = new Date(booking.pickup_at_utc);
      console.log(`  - Date 객체: ${utcDate.toISOString()}`);
      console.log(`  - 한국 시간: ${utcDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    }

    console.log('\n📝 UI에 표시되는 방식:');
    console.log('─'.repeat(80));
    const pickupDate = new Date(booking.pickup_date);
    console.log(`날짜: ${pickupDate.toLocaleDateString('ko-KR')}`);
    console.log(`시간: ${booking.pickup_time || ''}`);
    console.log(`결합: ${pickupDate.toLocaleDateString('ko-KR')} ${booking.pickup_time || ''}`);

    // 모든 렌트카 예약의 픽업 시간 패턴 확인
    console.log('\n\n📊 전체 렌트카 예약 픽업 시간 통계:');
    console.log('─'.repeat(80));
    const [allBookings] = await connection.execute(`
      SELECT
        id,
        booking_number,
        pickup_time,
        created_at
      FROM rentcar_bookings
      ORDER BY created_at DESC
      LIMIT 10
    `);

    allBookings.forEach(b => {
      console.log(`예약 #${b.id}: pickup_time = ${b.pickup_time}`);
    });

    console.log('\n✅ 분석 완료\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

checkPickupTime();
