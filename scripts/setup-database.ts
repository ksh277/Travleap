/**
 * 데이터베이스 초기 설정 스크립트
 *
 * 실행: npx ts-node scripts/setup-database.ts
 */

import { db } from '../utils/database-cloud.js';

async function setupDatabase() {
  console.log('📦 Starting database setup...\n');

  try {
    // 1. payment_events 테이블
    console.log('1️⃣ Creating payment_events table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payment_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id VARCHAR(255) NOT NULL UNIQUE,
        event_type VARCHAR(50) NOT NULL,
        booking_id INT,
        payment_key VARCHAR(255),
        amount DECIMAL(15, 2),
        raw_payload TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_payment_key (payment_key),
        INDEX idx_event_type (event_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ payment_events table created\n');

    // 2. booking_logs 테이블
    console.log('2️⃣ Creating booking_logs table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS booking_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ booking_logs table created\n');

    // 3. vendor_settings 테이블
    console.log('3️⃣ Creating vendor_settings table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vendor_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT NOT NULL,
        deposit_amount DECIMAL(10, 2) DEFAULT 50000,
        preauth_offset_minutes INT DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_listing_id (listing_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ vendor_settings table created\n');

    // 4. return_inspections 테이블
    console.log('4️⃣ Creating return_inspections table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS return_inspections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        inspector_id INT NULL,
        vehicle_condition VARCHAR(20) NOT NULL,
        fuel_level INT NOT NULL,
        mileage INT NOT NULL,
        damages_json JSON NULL,
        additional_fees_json JSON NULL,
        penalty_total DECIMAL(10, 2) DEFAULT 0,
        penalty_breakdown JSON NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ return_inspections table created\n');

    // 5. bookings 테이블 컬럼 추가 (에러 무시 - 이미 존재할 수 있음)
    console.log('5️⃣ Adding columns to bookings table...');

    const columnsToAdd = [
      { name: 'hold_expires_at', definition: 'TIMESTAMP NULL' },
      { name: 'deposit_auth_id', definition: 'VARCHAR(255) NULL' },
      { name: 'deposit_preauth_at', definition: 'TIMESTAMP NULL' },
      { name: 'payment_key', definition: 'VARCHAR(255) NULL' },
      { name: 'payment_approved_at', definition: 'TIMESTAMP NULL' },
      { name: 'customer_info', definition: 'JSON NULL' }
    ];

    for (const col of columnsToAdd) {
      try {
        // 컬럼 존재 여부 확인
        const columns = await db.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'bookings'
            AND COLUMN_NAME = ?
        `, [col.name]);

        if (columns.length === 0) {
          await db.execute(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.definition}`);
          console.log(`   ✅ Added column: ${col.name}`);
        } else {
          console.log(`   ℹ️  Column already exists: ${col.name}`);
        }
      } catch (error: any) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`   ℹ️  Column already exists: ${col.name}`);
        } else {
          console.error(`   ⚠️  Error adding column ${col.name}:`, error.message);
        }
      }
    }

    // 6. 인덱스 추가
    console.log('\n6️⃣ Adding indexes...');
    const indexes = [
      { name: 'idx_status_hold_expires', definition: '(status, hold_expires_at)' },
      { name: 'idx_payment_status', definition: '(payment_status)' },
      { name: 'idx_deposit_auth', definition: '(deposit_auth_id)' }
    ];

    for (const idx of indexes) {
      try {
        await db.execute(`ALTER TABLE bookings ADD INDEX ${idx.name} ${idx.definition}`);
        console.log(`   ✅ Added index: ${idx.name}`);
      } catch (error: any) {
        if (error.message.includes('Duplicate key name')) {
          console.log(`   ℹ️  Index already exists: ${idx.name}`);
        } else {
          console.error(`   ⚠️  Error adding index ${idx.name}:`, error.message);
        }
      }
    }

    console.log('\n✅ Database setup completed successfully!\n');

    // 테이블 확인
    console.log('📋 Verifying tables...');
    const tables = await db.query(`SHOW TABLES`);
    const tableNames = tables.map((t: any) => Object.values(t)[0]);

    const requiredTables = ['bookings', 'payment_events', 'booking_logs', 'vendor_settings', 'return_inspections'];
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (missing!)`);
      }
    }

    console.log('\n✅ Setup complete! You can now run the booking system.\n');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// 실행
setupDatabase();
