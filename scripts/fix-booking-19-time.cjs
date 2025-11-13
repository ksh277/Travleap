require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixBooking19Time() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('예약 #19 픽업 시간 수정');
    console.log('═══════════════════════════════════════════════════════\n');

    // 현재 시간 확인
    const [current] = await connection.execute(`
      SELECT pickup_date, pickup_time, dropoff_date, dropoff_time
      FROM rentcar_bookings
      WHERE id = 19
    `);

    console.log('📋 현재 저장된 시간:');
    console.log('   pickup_date:', current[0].pickup_date);
    console.log('   pickup_time:', current[0].pickup_time);
    console.log('   dropoff_date:', current[0].dropoff_date);
    console.log('   dropoff_time:', current[0].dropoff_time);

    // 올바른 시간으로 수정 (한국 시간 10:00 AM = UTC 01:00 AM)
    // 사용자가 의도한 시간: 2025-11-15 10:00 (한국 시간)
    // UTC로 저장: 2025-11-15 01:00
    // 하지만 pickup_time은 시간만 저장하므로 10:00:00으로 저장해야 함

    console.log('\n🔄 시간 수정 중...');
    console.log('   새로운 pickup_time: 10:00:00 (한국 시간 오전 10시)');
    console.log('   새로운 dropoff_time: 10:00:00 (다음날 오전 10시)');

    await connection.execute(`
      UPDATE rentcar_bookings
      SET pickup_time = '10:00:00',
          dropoff_time = '10:00:00'
      WHERE id = 19
    `);

    // 확인
    const [updated] = await connection.execute(`
      SELECT pickup_date, pickup_time, dropoff_date, dropoff_time
      FROM rentcar_bookings
      WHERE id = 19
    `);

    console.log('\n✅ 수정 완료!');
    console.log('   pickup_date:', updated[0].pickup_date);
    console.log('   pickup_time:', updated[0].pickup_time);
    console.log('   dropoff_date:', updated[0].dropoff_date);
    console.log('   dropoff_time:', updated[0].dropoff_time);
    console.log('\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

fixBooking19Time();
