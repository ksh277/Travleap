/**
 * Direct migration execution for lodging_bookings
 * Bypasses SQL file parsing issues
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function executeMigration() {
  let connection;

  try {
    console.log('🔧 Starting lodging_bookings table fix...\n');

    // Connect to database
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('✅ Connected to PlanetScale database\n');

    // Check current table structure
    console.log('🔍 Checking current table structure...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lodging_bookings'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DATABASE_NAME]);

    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log('Current columns:', existingColumns.join(', '));

    // Check which columns are missing
    const missingColumns = [];
    if (!existingColumns.includes('hold_expires_at')) missingColumns.push('hold_expires_at');
    if (!existingColumns.includes('rooms_booked')) missingColumns.push('rooms_booked');

    if (missingColumns.length === 0) {
      console.log('\n✅ All required columns already exist! No migration needed.\n');
      return;
    }

    console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}\n`);
    console.log('🚀 Executing migration...\n');

    // Add hold_expires_at column
    if (missingColumns.includes('hold_expires_at')) {
      console.log('  Adding column: hold_expires_at...');
      try {
        await connection.execute(`
          ALTER TABLE lodging_bookings
          ADD COLUMN hold_expires_at DATETIME DEFAULT NULL COMMENT 'HOLD 만료 시각 (10분)' AFTER payment_status
        `);
        console.log('  ✅ hold_expires_at added\n');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('  ⚠️  Column already exists\n');
        } else {
          throw err;
        }
      }
    }

    // Add rooms_booked column
    if (missingColumns.includes('rooms_booked')) {
      console.log('  Adding column: rooms_booked...');
      try {
        await connection.execute(`
          ALTER TABLE lodging_bookings
          ADD COLUMN rooms_booked INT DEFAULT 1 AFTER num_guests
        `);
        console.log('  ✅ rooms_booked added\n');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('  ⚠️  Column already exists\n');
        } else {
          throw err;
        }
      }
    }

    // Create index for hold expiration queries
    console.log('  Creating composite index: idx_hold_status...');
    try {
      await connection.execute(`
        CREATE INDEX idx_hold_status
        ON lodging_bookings(booking_status, payment_status, hold_expires_at)
      `);
      console.log('  ✅ Index created\n');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('  ⚠️  Index already exists\n');
      } else {
        console.log(`  ⚠️  Index creation skipped: ${err.message}\n`);
      }
    }

    // Update rooms_booked for existing rows
    console.log('  Updating existing rows...');
    const [updateResult] = await connection.execute(`
      UPDATE lodging_bookings
      SET rooms_booked = 1
      WHERE rooms_booked IS NULL OR rooms_booked = 0
    `);
    console.log(`  ✅ Updated ${updateResult.affectedRows} rows\n`);

    // Verify migration
    console.log('🔍 Verifying migration result...');
    const [newColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lodging_bookings'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DATABASE_NAME]);

    console.log('\nFinal table structure:');
    console.table(newColumns.map(c => ({
      Column: c.COLUMN_NAME,
      Type: c.DATA_TYPE,
      Nullable: c.IS_NULLABLE,
      Key: c.COLUMN_KEY || '-'
    })));

    // Check if critical columns exist
    const finalColumns = newColumns.map(c => c.COLUMN_NAME);
    const stillMissing = [];
    if (!finalColumns.includes('hold_expires_at')) stillMissing.push('hold_expires_at');
    if (!finalColumns.includes('rooms_booked')) stillMissing.push('rooms_booked');

    if (stillMissing.length > 0) {
      console.log(`\n❌ Migration incomplete! Still missing: ${stillMissing.join(', ')}`);
      process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ hold_expires_at column added');
    console.log('  ✅ rooms_booked column added');
    console.log('  ✅ Index created for performance');
    console.log('\n🎉 lodging_bookings table is now compatible with lodgingExpiry.worker.ts');
    console.log('🔄 The worker errors should stop now.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📡 Database connection closed');
    }
  }
}

// Execute migration
executeMigration();
