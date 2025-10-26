import { config } from 'dotenv';
import { db } from '../utils/database';

config();

async function checkBookingsSchema() {
  try {
    console.log('📊 bookings 테이블 구조 확인 중...\n');

    const result = await db.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('bookings 테이블 컬럼:');
    console.log('-'.repeat(100));
    result.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME.padEnd(30)} ${col.COLUMN_TYPE.padEnd(30)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('-'.repeat(100));
    console.log(`총 ${result.length}개 컬럼\n`);

    // booking_number 컬럼 존재 여부 확인
    const hasBookingNumber = result.some((col: any) => col.COLUMN_NAME === 'booking_number');

    if (hasBookingNumber) {
      console.log('✅ booking_number 컬럼이 이미 존재합니다.');
    } else {
      console.log('❌ booking_number 컬럼이 없습니다. migration이 필요합니다.');
    }

    process.exit(0);
  } catch (error) {
    console.error('에러:', error);
    process.exit(1);
  }
}

checkBookingsSchema();
