const mysql = require('mysql2/promise');
require('dotenv').config();

async function testRentcarAPI() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });

    console.log('\n' + '='.repeat(80));
    console.log('🚗 렌트카 API 데이터 구조 테스트');
    console.log('='.repeat(80));

    // 업체별 그룹핑 (API가 반환할 데이터와 동일한 쿼리)
    const [vendors] = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.vendor_code,
        COUNT(rv.id) as vehicle_count,
        MIN(rv.daily_rate_krw) as min_price,
        MAX(rv.daily_rate_krw) as max_price,
        MIN(rv.images) as sample_images,
        GROUP_CONCAT(DISTINCT rv.vehicle_class SEPARATOR ', ') as vehicle_classes
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id
      WHERE rv.is_active = 1
      GROUP BY v.id, v.vendor_code
      ORDER BY v.vendor_code
    `);

    console.log('\n📊 렌트카 업체 목록 API 결과:');
    console.log('-'.repeat(80));
    console.log(`총 ${vendors.length}개 업체`);

    vendors.forEach((vendor, idx) => {
      console.log(`\n${idx + 1}. ${vendor.vendor_code} (Vendor ID: ${vendor.vendor_id})`);
      console.log(`   - 차량 수: ${vendor.vehicle_count}대`);
      console.log(`   - 가격 범위: ₩${vendor.min_price?.toLocaleString()} ~ ₩${vendor.max_price?.toLocaleString()}/일`);
      console.log(`   - 차량 클래스: ${vendor.vehicle_classes || 'N/A'}`);

      // 이미지 파싱 테스트
      if (vendor.sample_images) {
        try {
          const images = JSON.parse(vendor.sample_images);
          console.log(`   - 샘플 이미지: ${Array.isArray(images) ? images.length + '개' : '형식 오류'}`);
        } catch (e) {
          console.log(`   - 샘플 이미지: JSON 파싱 오류`);
        }
      }
    });

    // 특정 업체의 차량 목록 조회 테스트 (첫 번째 업체)
    if (vendors.length > 0) {
      const testVendor = vendors[0];
      console.log('\n\n📋 업체 상세 (차량 목록) API 테스트:');
      console.log('-'.repeat(80));
      console.log(`테스트 대상: ${testVendor.vendor_code} (Vendor ID: ${testVendor.vendor_id})`);

      const [vehicles] = await connection.execute(`
        SELECT
          rv.id,
          rv.vendor_id,
          rv.vehicle_class,
          rv.brand,
          rv.model,
          rv.year,
          rv.display_name,
          rv.transmission,
          rv.fuel_type,
          rv.seating_capacity,
          rv.large_bags,
          rv.small_bags,
          rv.daily_rate_krw,
          rv.images,
          rv.features,
          rv.is_active,
          rv.is_featured,
          rv.average_rating,
          rv.total_bookings
        FROM rentcar_vehicles rv
        WHERE rv.vendor_id = ?
          AND rv.is_active = 1
        ORDER BY rv.daily_rate_krw ASC
        LIMIT 10
      `, [testVendor.vendor_id]);

      console.log(`\n총 ${vehicles.length}개 차량 (상위 10개):`);
      vehicles.forEach((vehicle, idx) => {
        console.log(`\n  ${idx + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model} (ID: ${vehicle.id})`);
        console.log(`     - 클래스: ${vehicle.vehicle_class}`);
        console.log(`     - 가격: ₩${vehicle.daily_rate_krw?.toLocaleString()}/일`);
        console.log(`     - 인승: ${vehicle.seats}명`);
        console.log(`     - 변속기: ${vehicle.transmission}`);
        console.log(`     - 연료: ${vehicle.fuel_type}`);

        // JSON 필드 파싱 테스트
        try {
          const images = JSON.parse(vehicle.images || '[]');
          console.log(`     - 이미지: ${Array.isArray(images) ? images.length + '개' : '형식 오류'}`);
        } catch (e) {
          console.log(`     - 이미지: JSON 파싱 오류`);
        }

        try {
          const features = JSON.parse(vehicle.features || '[]');
          console.log(`     - 옵션: ${Array.isArray(features) ? features.length + '개' : '형식 오류'}`);
        } catch (e) {
          console.log(`     - 옵션: JSON 파싱 오류`);
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ API 데이터 구조 테스트 완료');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    if (connection) await connection.end();
  }
}

testRentcarAPI();
