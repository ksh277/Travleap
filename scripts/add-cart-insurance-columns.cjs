const { connect } = require('@planetscale/database');
require('dotenv').config();

async function addInsuranceColumns() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== cart_items 테이블에 보험 컬럼 추가 ===\n');

  try {
    // selected_insurance 컬럼 추가
    console.log('1. selected_insurance 컬럼 추가 중...');
    await connection.execute(`
      ALTER TABLE cart_items
      ADD COLUMN selected_insurance TEXT NULL AFTER selected_options
    `);
    console.log('   ✅ selected_insurance 컬럼 추가 완료');

    // insurance_fee 컬럼 추가
    console.log('2. insurance_fee 컬럼 추가 중...');
    await connection.execute(`
      ALTER TABLE cart_items
      ADD COLUMN insurance_fee INT NULL DEFAULT 0 AFTER selected_insurance
    `);
    console.log('   ✅ insurance_fee 컬럼 추가 완료');

    // 결과 확인
    console.log('\n3. 변경 후 스키마 확인:');
    const result = await connection.execute('DESCRIBE cart_items');

    const insuranceColumns = result.rows.filter(row =>
      row.Field === 'selected_insurance' || row.Field === 'insurance_fee'
    );

    insuranceColumns.forEach(row => {
      console.log(`   ✅ ${row.Field} (${row.Type}) ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n🎉 cart_items 테이블 업데이트 완료!\n');

  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('⚠️ 컬럼이 이미 존재합니다.');
    } else {
      console.error('\n❌ 오류:', error.message);
      console.error('상세:', error);
    }
  }
}

addInsuranceColumns();
