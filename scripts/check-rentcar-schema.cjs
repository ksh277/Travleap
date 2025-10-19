require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkRentcarSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n=== rentcar_vendors 테이블 구조 ===');
    const vendorSchema = await connection.execute('DESCRIBE rentcar_vendors');
    console.log('Columns:', vendorSchema.rows.map(r => r.Field).join(', '));

    console.log('\n=== rentcar_vehicles 테이블 구조 ===');
    const vehicleSchema = await connection.execute('DESCRIBE rentcar_vehicles');
    console.log('Columns:', vehicleSchema.rows.map(r => r.Field).join(', '));

    console.log('\n=== 샘플 vendor 데이터 (ID=1) ===');
    const vendorData = await connection.execute('SELECT * FROM rentcar_vendors WHERE id = 1 LIMIT 1');
    if (vendorData.rows.length > 0) {
      console.log(JSON.stringify(vendorData.rows[0], null, 2));
    }

    console.log('\n=== 샘플 vehicle 데이터 (첫 1개) ===');
    const vehicleData = await connection.execute('SELECT * FROM rentcar_vehicles LIMIT 1');
    if (vehicleData.rows.length > 0) {
      console.log(JSON.stringify(vehicleData.rows[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRentcarSchema();
