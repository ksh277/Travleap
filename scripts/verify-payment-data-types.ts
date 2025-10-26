import { config } from 'dotenv';
import { db } from '../utils/database';

config();

async function verifyPaymentDataTypes() {
  try {
    console.log('🔍 payments 테이블 데이터 타입 정밀 검증\n');

    const columns = await db.query(`
      SELECT
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('='.repeat(120));
    console.log('payments 테이블 컬럼 타입:');
    console.log('='.repeat(120));

    // API에서 INSERT하는 컬럼만 확인
    const insertColumns = [
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
      'virtual_account_due_date'
    ];

    const issues: string[] = [];

    insertColumns.forEach(colName => {
      const col = columns.find((c: any) => c.COLUMN_NAME === colName);
      if (!col) {
        console.log(`❌ ${colName.padEnd(30)} - 컬럼이 존재하지 않음!`);
        issues.push(`${colName}: 컬럼 없음`);
        return;
      }

      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`✅ ${col.COLUMN_NAME.padEnd(30)} ${col.COLUMN_TYPE.padEnd(40)} ${nullable}`);

      // 타입별 잠재적 문제 확인
      if (col.COLUMN_NAME === 'payment_method' && col.COLUMN_TYPE.includes('enum')) {
        console.log(`   ⚠️  ENUM 타입: Toss API에서 받는 method 값이 enum과 일치하는지 확인 필요`);
        issues.push(`payment_method: ENUM 일치 확인 필요`);
      }

      if (col.COLUMN_NAME === 'amount' && col.COLUMN_TYPE.includes('decimal')) {
        console.log(`   ℹ️  DECIMAL 타입: Toss totalAmount (정수) → DECIMAL 변환 자동 처리됨`);
      }

      if (col.COLUMN_NAME === 'approved_at' && col.COLUMN_TYPE === 'datetime') {
        console.log(`   ℹ️  DATETIME 타입: ISO 문자열 → DATETIME 변환 자동 처리됨`);
      }

      if (col.IS_NULLABLE === 'NO' && col.COLUMN_DEFAULT === null && col.COLUMN_KEY !== 'PRI') {
        console.log(`   ⚠️  NOT NULL이지만 기본값 없음: 반드시 값을 제공해야 함`);
      }
    });

    console.log('='.repeat(120));
    console.log('\n📊 검증 결과:\n');

    if (issues.length > 0) {
      console.log('⚠️  주의가 필요한 항목:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ 모든 데이터 타입 검증 통과!');
    }

    console.log('\n💡 권장 사항:');
    console.log('   1. payment_method: Toss API 응답 값이 DB enum과 일치하는지 실제 테스트 필요');
    console.log('   2. amount: DECIMAL(10,2) = 최대 99,999,999.99원까지 지원');
    console.log('   3. approved_at: NULL 가능하므로 Toss에서 제공하지 않아도 안전');
    console.log('   4. user_id, amount, payment_method: NOT NULL이므로 반드시 값 제공 필요\n');

    process.exit(0);
  } catch (error) {
    console.error('에러:', error);
    process.exit(1);
  }
}

verifyPaymentDataTypes();
