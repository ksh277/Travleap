require('dotenv').config();
const mysql = require('mysql2/promise');

async function createBookingExtrasTable() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('🔧 rentcar_booking_extras 테이블 생성 중...\n');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_booking_extras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        extra_id INT NOT NULL,
        quantity INT DEFAULT 1,
        unit_price_krw DECIMAL(10, 2) DEFAULT 0,
        total_price_krw DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_extra_id (extra_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ rentcar_booking_extras 테이블 생성 완료');

    const [extras] = await connection.execute(`SELECT COUNT(*) as cnt FROM rentcar_booking_extras`);
    console.log(`📦 현재 데이터: ${extras[0].cnt}건`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await connection.end();
  }
}

createBookingExtrasTable();
