require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testRentcarAPI() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n=== 렌트카 업체 목록 조회 ===');
    const vendors = await connection.execute('SELECT * FROM rentcar_vendors WHERE status = "active"');
    console.log(`총 ${vendors.rows.length}개 업체 발견`);
    vendors.rows.forEach(v => {
      console.log(`  - [${v.id}] ${v.business_name} (${v.vendor_code})`);
    });

    console.log('\n=== 차량 목록 조회 ===');
    const vehicles = await connection.execute('SELECT * FROM rentcar_vehicles WHERE is_active = 1');
    console.log(`총 ${vehicles.rows.length}개 차량 발견`);
    if (vehicles.rows.length > 0) {
      console.log('샘플 차량:');
      vehicles.rows.slice(0, 3).forEach(v => {
        console.log(`  - [${v.id}] ${v.display_name} (₩${v.daily_rate_krw}/일) - vendor_id: ${v.vendor_id}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testRentcarAPI();
