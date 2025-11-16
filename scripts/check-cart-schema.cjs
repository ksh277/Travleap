const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkCartSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== cart_items 테이블 스키마 확인 ===\n');

  try {
    const result = await connection.execute('DESCRIBE cart_items');

    console.log('현재 컬럼 목록:');
    result.rows.forEach(row => {
      console.log(`  - ${row.Field} (${row.Type}) ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${row.Key ? `KEY: ${row.Key}` : ''}`);
    });

    // selected_insurance와 insurance_fee 컬럼 존재 여부 확인
    const hasSelectedInsurance = result.rows.some(row => row.Field === 'selected_insurance');
    const hasInsuranceFee = result.rows.some(row => row.Field === 'insurance_fee');

    console.log('\n필수 컬럼 확인:');
    console.log(`  selected_insurance: ${hasSelectedInsurance ? '✅ 존재' : '❌ 없음'}`);
    console.log(`  insurance_fee: ${hasInsuranceFee ? '✅ 존재' : '❌ 없음'}`);

    if (!hasSelectedInsurance || !hasInsuranceFee) {
      console.log('\n⚠️ 누락된 컬럼이 있습니다. ALTER TABLE이 필요합니다.');
    }

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
  }
}

checkCartSchema();
