#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateListingsTable() {
  console.log('🔧 Starting listings table migration...');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  try {
    // 필드 추가
    const migrations = [
      {
        name: 'child_price',
        sql: 'ALTER TABLE listings ADD COLUMN child_price DECIMAL(10, 2) AFTER price_to'
      },
      {
        name: 'infant_price',
        sql: 'ALTER TABLE listings ADD COLUMN infant_price DECIMAL(10, 2) AFTER child_price'
      },
      {
        name: 'itinerary',
        sql: 'ALTER TABLE listings ADD COLUMN itinerary JSON AFTER excluded'
      },
      {
        name: 'available_start_times',
        sql: 'ALTER TABLE listings ADD COLUMN available_start_times JSON AFTER itinerary'
      },
      {
        name: 'packages',
        sql: 'ALTER TABLE listings ADD COLUMN packages JSON AFTER available_start_times'
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

    console.log('🎉 Listings table migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateListingsTable();
