const mysql = require('mysql2/promise');
require('dotenv').config();

async function verify() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });
    
    console.log('📊 데이터베이스 현황 확인\n');
    console.log('='.repeat(70));
    
    // 렌트카 벤더 수
    const [vendors] = await connection.execute('SELECT COUNT(*) as count FROM rentcar_vendors');
    console.log(`🏢 렌트카 벤더: ${vendors[0].count}개`);
    
    // 렌트카 차량 수
    const [vehicles] = await connection.execute('SELECT COUNT(*) as count FROM rentcar_vehicles');
    console.log(`🚗 렌트카 차량: ${vehicles[0].count}대`);
    
    // 파트너 수 (전체)
    const [partners] = await connection.execute('SELECT COUNT(*) as count FROM partners');
    console.log(`🤝 파트너: ${partners[0].count}개`);
    
    // 숙박 상품 수
    const [accommodations] = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE category_id = 1');
    console.log(`🛏️  숙박 상품: ${accommodations[0].count}개`);
    
    console.log('='.repeat(70));
    console.log('\n📋 벤더별 차량 수:');
    const [vendorDetails] = await connection.execute(`
      SELECT rv.business_name, rv.vendor_code, COUNT(v.id) as vehicle_count
      FROM rentcar_vendors rv
      LEFT JOIN rentcar_vehicles v ON rv.id = v.vendor_id
      GROUP BY rv.id, rv.business_name, rv.vendor_code
      ORDER BY vehicle_count DESC
    `);
    vendorDetails.forEach(v => {
      console.log(`  - ${v.business_name} (${v.vendor_code}): ${v.vehicle_count}대`);
    });
    
    console.log('\n🚙 차량 클래스 분포:');
    const [classStats] = await connection.execute(`
      SELECT vehicle_class, COUNT(*) as count
      FROM rentcar_vehicles
      GROUP BY vehicle_class
      ORDER BY count DESC
    `);
    classStats.forEach(s => {
      console.log(`  - ${s.vehicle_class}: ${s.count}대`);
    });
    
    console.log('\n⛽ 연료 타입 분포:');
    const [fuelStats] = await connection.execute(`
      SELECT fuel_type, COUNT(*) as count
      FROM rentcar_vehicles
      GROUP BY fuel_type
      ORDER BY count DESC
    `);
    fuelStats.forEach(s => {
      console.log(`  - ${s.fuel_type}: ${s.count}대`);
    });
    
    console.log('\n💰 가격대 분포:');
    const [priceStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN daily_rate_krw < 40000 THEN '3만원대'
          WHEN daily_rate_krw < 50000 THEN '4만원대'
          WHEN daily_rate_krw < 70000 THEN '5-6만원대'
          WHEN daily_rate_krw < 100000 THEN '7-9만원대'
          WHEN daily_rate_krw < 150000 THEN '10-15만원대'
          ELSE '15만원 이상'
        END as price_range,
        COUNT(*) as count
      FROM rentcar_vehicles
      GROUP BY price_range
      ORDER BY MIN(daily_rate_krw)
    `);
    priceStats.forEach(s => {
      console.log(`  - ${s.price_range}: ${s.count}대`);
    });
    
    console.log('\n='.repeat(70));
    console.log('✅ 데이터 확인 완료!\n');
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    if (connection) await connection.end();
  }
}

verify();
