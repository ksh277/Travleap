import { config } from 'dotenv';
import { db } from '../utils/database';

config();

async function checkPaymentsSchema() {
  try {
    console.log('📊 payments 테이블 구조 확인 중...\n');

    const result = await db.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('payments 테이블 컬럼:');
    console.log('-'.repeat(100));
    result.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME.padEnd(30)} ${col.COLUMN_TYPE.padEnd(30)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('-'.repeat(100));
    console.log(`총 ${result.length}개 컬럼\n`);

    // API 코드에서 사용하는 컬럼 목록
    const requiredColumns = [
      'user_id',
      'booking_id',
      'order_id',
      'payment_key',
      'order_id_str',
      'amount',
      'payment_method',
      'payment_status',
      'approved_at',
      'receipt_url',
      'card_company',
      'card_number',
      'card_installment',
      'virtual_account_number',
      'virtual_account_bank',
      'virtual_account_due_date',
      'created_at',
      'updated_at'
    ];

    console.log('API 코드에서 INSERT하는 컬럼 검증:\n');

    const existingColumns = result.map((col: any) => col.COLUMN_NAME);
    let allPresent = true;

    requiredColumns.forEach(reqCol => {
      if (existingColumns.includes(reqCol)) {
        console.log(`✅ ${reqCol}`);
      } else {
        console.log(`❌ ${reqCol} - 누락됨!`);
        allPresent = false;
      }
    });

    console.log('');
    if (allPresent) {
      console.log('✅ 모든 필수 컬럼이 존재합니다!');
    } else {
      console.log('❌ 일부 컬럼이 누락되었습니다. migration이 필요합니다.');
    }

    process.exit(0);
  } catch (error) {
    console.error('에러:', error);
    process.exit(1);
  }
}

checkPaymentsSchema();
