const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDataComplete() {
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
    console.log('📊 Travleap 플랫폼 전체 데이터 테스트');
    console.log('='.repeat(80));

    // 1. 카테고리 확인
    console.log('\n1️⃣  카테고리 시스템:');
    console.log('-'.repeat(80));
    const [categories] = await connection.execute(
      'SELECT * FROM categories ORDER BY id'
    );
    categories.forEach(c => {
      console.log(`   ID ${c.id}: ${c.name_ko || c.name} (slug: ${c.slug})`);
    });

    // 2. 숙박 데이터 확인
    console.log('\n2️⃣  숙박 데이터:');
    console.log('-'.repeat(80));
    const [accommodations] = await connection.execute(`
      SELECT l.*, p.business_name
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.category_id = 1857
      ORDER BY l.id DESC
    `);
    console.log(`   총 ${accommodations.length}개 숙박 상품\n`);
    accommodations.forEach((a, idx) => {
      console.log(`   ${idx + 1}. ${a.title}`);
      console.log(`      - 파트너: ${a.business_name}`);
      console.log(`      - 가격: ₩${a.price_from.toLocaleString()}/박`);
      console.log(`      - 재고: ${a.available_spots}실`);
      console.log(`      - Published: ${a.is_published ? 'Yes' : 'No'}, Active: ${a.is_active ? 'Yes' : 'No'}`);
    });

    // 3. 렌트카 데이터 확인 (DB listings)
    console.log('\n3️⃣  렌트카 데이터 (listings 테이블):');
    console.log('-'.repeat(80));
    const [rentcarListings] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM listings
      WHERE category_id = 1856
    `);
    console.log(`   총 ${rentcarListings[0].count}개 렌트카 상품 (listings)`);

    // 4. 렌트카 차량 데이터 (rentcar_vehicles)
    console.log('\n4️⃣  렌트카 차량 데이터 (rentcar_vehicles 테이블):');
    console.log('-'.repeat(80));
    const [vendorStats] = await connection.execute(`
      SELECT
        rv.id,
        rv.business_name,
        rv.vendor_code,
        COUNT(v.id) as vehicle_count
      FROM rentcar_vendors rv
      LEFT JOIN rentcar_vehicles v ON rv.id = v.vendor_id
      GROUP BY rv.id, rv.business_name, rv.vendor_code
      ORDER BY vehicle_count DESC
    `);

    let totalVehicles = 0;
    vendorStats.forEach(v => {
      const isPMS = v.vendor_code && v.vendor_code.includes('TURO');
      const badge = isPMS ? ' [PMS 연동 ✅]' : '';
      console.log(`   ${v.business_name}${badge}: ${v.vehicle_count}대`);
      totalVehicles += v.vehicle_count;
    });
    console.log(`\n   ✅ 총 ${totalVehicles}대 차량`);

    // 5. PMS 데이터 샘플 확인
    console.log('\n5️⃣  PMS 연동 데이터 샘플:');
    console.log('-'.repeat(80));

    // PMS 숙박
    const [pmsAccom] = await connection.execute(`
      SELECT l.title, l.price_from, l.available_spots, p.business_name
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.category_id = 1857
      AND l.partner_id = (SELECT id FROM partners ORDER BY id DESC LIMIT 1)
      LIMIT 3
    `);
    console.log(`   숙박 (CloudBeds PMS):`);
    pmsAccom.forEach(r => {
      const roomName = r.title.includes(' - ') ? r.title.split(' - ')[1] : r.title;
      console.log(`   - ${roomName}: ₩${r.price_from.toLocaleString()}/박 (${r.available_spots}실)`);
    });

    // PMS 렌트카
    const [pmsRentcar] = await connection.execute(`
      SELECT v.brand, v.model, v.year, v.vehicle_class, v.daily_rate_krw, vendor.business_name
      FROM rentcar_vehicles v
      LEFT JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE vendor.vendor_code LIKE '%TURO%'
      LIMIT 5
    `);
    console.log(`\n   렌트카 (Turo PMS):`);
    pmsRentcar.forEach(v => {
      console.log(`   - ${v.brand} ${v.model} ${v.year} (${v.vehicle_class}): ₩${v.daily_rate_krw.toLocaleString()}/일`);
    });

    // 6. 예약 가능 여부 테스트
    console.log('\n6️⃣  데이터 유효성 검증:');
    console.log('-'.repeat(80));

    const [activeAccom] = await connection.execute(`
      SELECT COUNT(*) as count FROM listings
      WHERE category_id = 1857 AND is_published = 1 AND is_active = 1
    `);
    console.log(`   ✅ 활성 숙박 상품: ${activeAccom[0].count}개`);

    const [activeVehicles] = await connection.execute(`
      SELECT COUNT(*) as count FROM rentcar_vehicles WHERE is_active = 1
    `);
    console.log(`   ✅ 활성 렌트카: ${activeVehicles[0].count}대`);

    const [imagesCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM listings
      WHERE category_id = 1857 AND (images IS NULL OR images = '[]')
    `);
    console.log(`   ${imagesCheck[0].count === 0 ? '✅' : '⚠️ '} 이미지 없는 상품: ${imagesCheck[0].count}개`);

    // 7. 결제 준비 상태
    console.log('\n7️⃣  결제 준비 상태:');
    console.log('-'.repeat(80));

    const [priceCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM listings
      WHERE category_id = 1857 AND (price_from IS NULL OR price_from = 0)
    `);
    console.log(`   ${priceCheck[0].count === 0 ? '✅' : '⚠️ '} 가격 미설정 상품: ${priceCheck[0].count}개`);

    const [vehiclePriceCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM rentcar_vehicles
      WHERE daily_rate_krw IS NULL OR daily_rate_krw = 0
    `);
    console.log(`   ${vehiclePriceCheck[0].count === 0 ? '✅' : '⚠️ '} 가격 미설정 차량: ${vehiclePriceCheck[0].count}개`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ 전체 데이터 테스트 완료!');
    console.log('='.repeat(80));

    console.log('\n📝 다음 단계:');
    console.log('   1. 배포 사이트에서 숙박 카테고리 확인: /category/stay');
    console.log('   2. 배포 사이트에서 렌트카 확인: /rentcars 또는 /category/rentcar');
    console.log('   3. 각 상품 상세 페이지 클릭 테스트');
    console.log('   4. 결제 프로세스 테스트 (여러 번)');
    console.log('   5. PMS 연동 데이터 표시 확인 (CloudBeds, Turo 배지)');
    console.log('');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    if (connection) await connection.end();
  }
}

testDataComplete();
