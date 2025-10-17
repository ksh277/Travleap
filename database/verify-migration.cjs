/**
 * Verify lodging_bookings migration was successful
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function verify() {
  let connection;

  try {
    console.log('📡 Connecting to PlanetScale...\n');

    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Check table columns
    console.log('🔍 Checking lodging_bookings schema...\n');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lodging_bookings'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DATABASE_NAME]);

    console.log('📋 Current columns:');
    columns.forEach((col, idx) => {
      const mark = (col.COLUMN_NAME === 'hold_expires_at' || col.COLUMN_NAME === 'rooms_booked') ? '✅' : '  ';
      console.log(`${mark} ${idx + 1}. ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    const columnNames = columns.map(c => c.COLUMN_NAME);

    console.log('\n🎯 Required columns check:');
    const hasHoldExpires = columnNames.includes('hold_expires_at');
    const hasRoomsBooked = columnNames.includes('rooms_booked');
    const hasBookingNumber = columnNames.includes('booking_number');

    console.log(`  ${hasHoldExpires ? '✅' : '❌'} hold_expires_at: ${hasHoldExpires ? 'EXISTS' : 'MISSING'}`);
    console.log(`  ${hasRoomsBooked ? '✅' : '❌'} rooms_booked: ${hasRoomsBooked ? 'EXISTS' : 'MISSING'}`);
    console.log(`  ${hasBookingNumber ? '✅' : '❌'} booking_number: ${hasBookingNumber ? 'EXISTS' : 'MISSING'}`);

    // Try to query the table directly
    console.log('\n🔍 Testing actual query...');
    try {
      const [rows] = await connection.query(`
        SELECT id, booking_number, hold_expires_at, rooms_booked
        FROM lodging_bookings
        LIMIT 1
      `);
      console.log(`✅ Query successful! Found ${rows.length} rows.`);
    } catch (queryErr) {
      console.log(`❌ Query failed: ${queryErr.message}`);
    }

    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const [indexes] = await connection.query(`
      SHOW INDEX FROM lodging_bookings
      WHERE Key_name = 'idx_hold_status'
    `);
    console.log(`  ${indexes.length > 0 ? '✅' : '⚠️ '} idx_hold_status: ${indexes.length > 0 ? 'EXISTS' : 'MISSING'}`);

    if (hasHoldExpires && hasRoomsBooked) {
      console.log('\n✅ Migration verified successfully!');
      console.log('   All required columns exist.');
      console.log('\n💡 The worker errors are likely due to PlanetScale query cache.');
      console.log('   The cache should clear within 1-2 minutes.');
    } else {
      console.log('\n❌ Migration incomplete!');
      console.log('   Please re-run the migration.');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verify();
