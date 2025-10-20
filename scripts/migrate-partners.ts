#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function migratePartnersTable() {
  console.log('🔧 Starting partners table migration...');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  try {
    // 필드 추가 (이미 존재하면 에러 무시)
    const migrations = [
      {
        name: 'location',
        sql: 'ALTER TABLE partners ADD COLUMN location VARCHAR(200) AFTER services'
      },
      {
        name: 'base_price',
        sql: 'ALTER TABLE partners ADD COLUMN base_price DECIMAL(10, 2) DEFAULT 0 AFTER location'
      },
      {
        name: 'detailed_address',
        sql: 'ALTER TABLE partners ADD COLUMN detailed_address TEXT AFTER base_price'
      },
      {
        name: 'images',
        sql: 'ALTER TABLE partners ADD COLUMN images JSON AFTER detailed_address'
      },
      {
        name: 'business_hours',
        sql: 'ALTER TABLE partners ADD COLUMN business_hours VARCHAR(200) AFTER images'
      },
      {
        name: 'is_active',
        sql: 'ALTER TABLE partners ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER is_featured'
      }
    ];

    for (const migration of migrations) {
      try {
        await connection.execute(migration.sql);
        console.log(`✅ Added column: ${migration.name}`);
      } catch (error: any) {
        if (error.message?.includes('Duplicate column')) {
          console.log(`⏭️  Column ${migration.name} already exists, skipping`);
        } else {
          console.error(`❌ Error adding column ${migration.name}:`, error.message);
        }
      }
    }

    // 인덱스 추가
    try {
      await connection.execute('CREATE INDEX idx_location ON partners(location)');
      console.log('✅ Added index: idx_location');
    } catch (error: any) {
      if (error.message?.includes('Duplicate key')) {
        console.log('⏭️  Index idx_location already exists, skipping');
      }
    }

    try {
      await connection.execute('CREATE INDEX idx_active ON partners(is_active)');
      console.log('✅ Added index: idx_active');
    } catch (error: any) {
      if (error.message?.includes('Duplicate key')) {
        console.log('⏭️  Index idx_active already exists, skipping');
      }
    }

    console.log('🎉 Partners table migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migratePartnersTable();
