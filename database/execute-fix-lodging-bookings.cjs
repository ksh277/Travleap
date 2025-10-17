/**
 * Execute fix-lodging-bookings.sql migration
 * Critical: Adds hold_expires_at, booking_number, rooms_booked columns
 *
 * Usage: node database/execute-fix-lodging-bookings.cjs
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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
      },
      multipleStatements: true
    });
    console.log('✅ Connected to PlanetScale database\n');

    // Check current table structure
    console.log('🔍 Checking current table structure...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lodging_bookings'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DATABASE_NAME]);

    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log('Current columns:', existingColumns.join(', '));

    // Check which columns are missing
    const missingColumns = [];
    if (!existingColumns.includes('hold_expires_at')) missingColumns.push('hold_expires_at');
    if (!existingColumns.includes('booking_number')) missingColumns.push('booking_number');
    if (!existingColumns.includes('rooms_booked')) missingColumns.push('rooms_booked');

    if (missingColumns.length === 0) {
      console.log('\n✅ All required columns already exist! No migration needed.\n');
      return;
    }

    console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}\n`);

    // Read migration file
    const sqlFile = path.join(__dirname, 'fix-lodging-bookings.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Execute migration
    console.log('🚀 Executing migration...\n');

    // Split SQL into individual statements and execute them one by one
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('ALTER TABLE')) {
        const columnMatch = statement.match(/ADD COLUMN (?:IF NOT EXISTS )?(\w+)/);
        const columnName = columnMatch ? columnMatch[1] : 'unknown';
        console.log(`  Adding column: ${columnName}...`);
      } else if (statement.includes('CREATE INDEX')) {
        const indexMatch = statement.match(/IF NOT EXISTS (\w+)/);
        const indexName = indexMatch ? indexMatch[1] : 'unknown';
        console.log(`  Creating index: ${indexName}...`);
      } else if (statement.includes('UPDATE')) {
        console.log(`  Updating existing rows...`);
      } else if (statement.includes('SELECT')) {
        console.log(`  Verifying migration...`);
      }

      try {
        await connection.execute(statement);
        console.log('  ✅ Success\n');
      } catch (err) {
        // Ignore "duplicate column" errors (already exists)
        if (err.code === 'ER_DUP_FIELDNAME' ||
            err.message.includes('Duplicate column') ||
            err.message.includes('already exists')) {
          console.log('  ⚠️  Column already exists, skipping\n');
        } else {
          throw err;
        }
      }
    }

    // Verify migration
    console.log('\n🔍 Verifying migration result...');
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
    if (!finalColumns.includes('booking_number')) stillMissing.push('booking_number');
    if (!finalColumns.includes('rooms_booked')) stillMissing.push('rooms_booked');

    if (stillMissing.length > 0) {
      console.log(`\n❌ Migration incomplete! Still missing: ${stillMissing.join(', ')}`);
      process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ hold_expires_at column added');
    console.log('  ✅ booking_number column added');
    console.log('  ✅ rooms_booked column added');
    console.log('  ✅ Indexes created for performance');
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
