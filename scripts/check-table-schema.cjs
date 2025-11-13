require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('테이블 스키마 확인');
    console.log('═══════════════════════════════════════════════════════\n');

    // rentcar_bookings 컬럼 확인
    const [bookingColumns] = await connection.execute(`
      SHOW COLUMNS FROM rentcar_bookings
    `);

    console.log('📋 rentcar_bookings 컬럼:');
    bookingColumns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });

    // rentcar_vehicles 컬럼 확인
    const [vehicleColumns] = await connection.execute(`
      SHOW COLUMNS FROM rentcar_vehicles
    `);

    console.log('\n🚗 rentcar_vehicles 컬럼:');
    vehicleColumns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });

    console.log('\n✅ 완료\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
