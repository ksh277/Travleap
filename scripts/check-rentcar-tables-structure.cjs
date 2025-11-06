const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 Checking rentcar tables structure...\n');

    // rentcar_vehicles 테이블 구조
    console.log('📋 rentcar_vehicles 테이블 구조:');
    const vehiclesSchemaResult = await connection.execute('DESCRIBE rentcar_vehicles');
    vehiclesSchemaResult.rows.forEach(row => {
      console.log(`  - ${row.Field} (${row.Type}) ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n📊 rentcar_vehicles 데이터:');
    const vehiclesDataResult = await connection.execute('SELECT * FROM rentcar_vehicles LIMIT 5');
    console.log(`  총 ${vehiclesDataResult.rows.length}개의 차량\n`);
    vehiclesDataResult.rows.forEach((row, index) => {
      console.log(`  차량 ${index + 1}:`);
      Object.keys(row).forEach(key => {
        if (row[key]) {
          console.log(`    ${key}: ${typeof row[key] === 'object' ? JSON.stringify(row[key]).substring(0, 50) : row[key]}`);
        }
      });
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
