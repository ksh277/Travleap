require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false }
  });

  console.log('📋 Bookings 테이블 필수 컬럼 확인:');
  const required = ['booking_number', 'start_date', 'customer_info', 'hold_expires_at', 'status', 'payment_status'];
  const [cols] = await c.query('DESCRIBE bookings');
  const existing = cols.map(c => c.Field);
  const missing = required.filter(r => !existing.includes(r));

  if (missing.length > 0) {
    console.log('❌ 누락된 컬럼:', missing.join(', '));
  } else {
    console.log('✅ 모든 필수 컬럼 존재');
  }

  console.log('\n📋 Listings 테이블 필수 컬럼 확인:');
  const [lcols] = await c.query('DESCRIBE listings');
  const lexisting = lcols.map(c => c.Field);

  if (lexisting.includes('available_spots') && lexisting.includes('max_capacity')) {
    console.log('✅ available_spots, max_capacity 존재');
  } else {
    console.log('❌ 누락:', !lexisting.includes('available_spots') ? 'available_spots ' : '', !lexisting.includes('max_capacity') ? 'max_capacity' : '');
  }

  console.log('\n📋 booking_logs 테이블 확인:');
  try {
    const [blogsCols] = await c.query('DESCRIBE booking_logs');
    console.log('✅ booking_logs 테이블 존재 (' + blogsCols.length + ' 컬럼)');
  } catch (e) {
    console.log('❌ booking_logs 테이블 없음');
  }

  await c.end();
})();
