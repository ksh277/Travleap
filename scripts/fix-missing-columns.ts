/**
 * Fix missing columns in database schema
 * - Add deposit_amount to vendor_settings
 * - Add room_id to lodging_bookings
 */

import 'dotenv/config';
import { db } from '../utils/database';

async function fixMissingColumns() {
  console.log('🔧 DB 스키마 수정 시작...\n');

  try {
    // 1. vendor_settings 테이블에 deposit_amount 컬럼 추가
    console.log('📋 1. vendor_settings 테이블 확인...');

    // 먼저 컬럼이 존재하는지 확인
    const vendorSettingsCols = await db.query('DESCRIBE vendor_settings');
    const hasDepositAmount = vendorSettingsCols.some((col: any) => col.Field === 'deposit_amount');

    if (!hasDepositAmount) {
      try {
        await db.execute(`
          ALTER TABLE vendor_settings
          ADD COLUMN deposit_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '보증금 금액'
        `);
        console.log('   ✅ deposit_amount 컬럼 추가 완료\n');
      } catch (error: any) {
        if (error.message.includes('Duplicate column name')) {
          console.log('   ℹ️ deposit_amount 컬럼이 이미 존재합니다\n');
        } else {
          throw error;
        }
      }
    } else {
      console.log('   ℹ️ deposit_amount 컬럼이 이미 존재합니다\n');
    }

    // 2. lodging_bookings 테이블에 room_id 컬럼 추가
    console.log('📋 2. lodging_bookings 테이블 확인...');

    const lodgingBookingsCols = await db.query('DESCRIBE lodging_bookings');
    const hasRoomId = lodgingBookingsCols.some((col: any) => col.Field === 'room_id');

    if (!hasRoomId) {
      try {
        await db.execute(`
          ALTER TABLE lodging_bookings
          ADD COLUMN room_id INT COMMENT '객실 ID'
        `);
        console.log('   ✅ room_id 컬럼 추가 완료\n');
      } catch (error: any) {
        if (error.message.includes('Duplicate column name')) {
          console.log('   ℹ️ room_id 컬럼이 이미 존재합니다\n');
        } else {
          throw error;
        }
      }
    } else {
      console.log('   ℹ️ room_id 컬럼이 이미 존재합니다\n');
    }

    // 3. 테이블 구조 확인
    console.log('📊 수정 후 테이블 구조 확인:\n');

    console.log('📋 vendor_settings:');
    const vendorSettingsCols2 = await db.query('DESCRIBE vendor_settings');
    vendorSettingsCols2.forEach((col: any) => {
      if (col.Field === 'deposit_amount') {
        console.log(`   ✅ ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
      }
    });

    console.log('\n📋 lodging_bookings:');
    const lodgingBookingsCols2 = await db.query('DESCRIBE lodging_bookings');
    lodgingBookingsCols2.forEach((col: any) => {
      if (col.Field === 'room_id') {
        console.log(`   ✅ ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
      }
    });

    console.log('\n✅ DB 스키마 수정 완료!');
  } catch (error) {
    console.error('❌ DB 스키마 수정 실패:', error);
    throw error;
  }
}

// 스크립트 실행
fixMissingColumns()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류:', error);
    process.exit(1);
  });
