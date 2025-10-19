require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testRentcarAPI() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('Testing /api/rentcars:\n');

  try {
    const vendors = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.vendor_code,
        v.business_name,
        v.brand_name,
        v.average_rating,
        v.is_verified,
        COUNT(rv.id) as vehicle_count,
        MIN(rv.daily_rate_krw) as min_price,
        MAX(rv.daily_rate_krw) as max_price,
        MIN(rv.images) as sample_images,
        GROUP_CONCAT(DISTINCT rv.vehicle_class SEPARATOR ', ') as vehicle_classes
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1
      WHERE v.status = 'active'
      GROUP BY v.id, v.vendor_code, v.business_name, v.brand_name, v.average_rating, v.is_verified
      ORDER BY v.is_verified DESC, v.business_name ASC
    `);

    console.log('Found ' + vendors.rows.length + ' vendors:');
    vendors.rows.forEach(v => {
      console.log('   - [' + v.vendor_id + '] ' + v.business_name + ' (' + v.vehicle_count + ' vehicles)');
    });

    console.log('\n✅ Rentcar API will return ' + vendors.rows.length + ' vendors');
  } catch (error) {
    console.log('❌ ERROR: ' + error.message);
  }
}

testRentcarAPI().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
