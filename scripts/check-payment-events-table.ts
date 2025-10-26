import { config } from 'dotenv';
import { db } from '../utils/database';

config();

async function checkPaymentEventsTable() {
  try {
    console.log('🔍 payment_events 테이블 확인 중...\n');

    const tables = await db.query(`SHOW TABLES LIKE 'payment_events'`);

    if (tables.length > 0) {
      console.log('✅ payment_events 테이블이 존재합니다.\n');

      // 테이블 구조 확인
      const columns = await db.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payment_events'
        ORDER BY ORDINAL_POSITION
      `);

      console.log('테이블 구조:');
      console.log('-'.repeat(80));
      columns.forEach((col: any) => {
        console.log(`  ${col.COLUMN_NAME.padEnd(25)} ${col.COLUMN_TYPE.padEnd(30)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      console.log('-'.repeat(80));
    } else {
      console.log('❌ payment_events 테이블이 존재하지 않습니다!');
      console.log('\n⚠️  Webhook 이벤트 기록이 실패할 수 있습니다.');
      console.log('\n💡 해결 방법: payment_events 테이블을 생성해야 합니다.');
    }

    process.exit(0);
  } catch (error) {
    console.error('에러:', error);
    process.exit(1);
  }
}

checkPaymentEventsTable();
