/**
 * Check lodging_bookings table schema
 * Verify if hold_expires_at and rooms_booked columns exist
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkColumns() {
  let connection;

  try {
    console.log('🔍 Checking lodging_bookings schema...\n');

    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: { rejectUnauthorized: false }
    });

    // Get all columns
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lodging_bookings'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DATABASE_NAME]);

    console.log('📋 lodging_bookings 컬럼 목록:');
    console.log('═══════════════════════════════════════════════════════════\n');

    columns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}`);
      console.log(`    Type: ${col.DATA_TYPE}`);
      console.log(`    Default: ${col.COLUMN_DEFAULT}`);
      console.log(`    Comment: ${col.COLUMN_COMMENT || '(none)'}`);
      console.log('');
    });

    // Check specific columns
    const colNames = columns.map(c => c.COLUMN_NAME);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 필수 컬럼 검증:\n');

    const requiredColumns = ['hold_expires_at', 'rooms_booked', 'booking_status'];

    requiredColumns.forEach(colName => {
      if (colNames.includes(colName)) {
        console.log(`  ✅ ${colName} - 존재함`);
      } else {
        console.log(`  ❌ ${colName} - 없음 (추가 필요)`);
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Check for 'status' column (should be 'booking_status')
    if (colNames.includes('status')) {
      console.log('  ⚠️  WARNING: "status" 컬럼 발견');
      console.log('      → 코드는 "booking_status" 사용 중\n');
    }

    if (!colNames.includes('hold_expires_at')) {
      console.log('❌ hold_expires_at 컬럼이 없습니다!');
      console.log('   PlanetScale 콘솔에서 다음 SQL 실행:\n');
      console.log('   ALTER TABLE lodging_bookings');
      console.log('   ADD COLUMN hold_expires_at DATETIME DEFAULT NULL');
      console.log('   COMMENT \'HOLD 만료 시각 (10분)\'\n');
    }

    if (!colNames.includes('rooms_booked')) {
      console.log('❌ rooms_booked 컬럼이 없습니다!');
      console.log('   PlanetScale 콘솔에서 다음 SQL 실행:\n');
      console.log('   ALTER TABLE lodging_bookings');
      console.log('   ADD COLUMN rooms_booked INT DEFAULT 1\n');
    }

    await connection.end();

  } catch (error) {
    console.error('❌ 에러:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkColumns();
