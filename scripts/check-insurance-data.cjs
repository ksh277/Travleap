const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkInsurance() {
  const connection = connect({ url: process.env.DATABASE_URL });

  const result = await connection.execute('SELECT * FROM rentcar_insurance WHERE is_active = 1');

  console.log('렌트카 보험 데이터:');
  console.log('');
  console.log('총', result.rows.length, '개 보험 상품');
  console.log('');
  result.rows.forEach((ins, idx) => {
    console.log(`${idx + 1}. [${ins.id}] ${ins.name}`);
    console.log(`   가격: ${ins.price || ins.hourly_rate_krw}원/${ins.pricing_unit || 'hourly'}`);
    console.log(`   is_active: ${ins.is_active}`);
    console.log('');
  });
}

checkInsurance();
