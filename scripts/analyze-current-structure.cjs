const mysql = require('mysql2/promise');
require('dotenv').config();

async function analyze() {
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
    console.log('📊 현재 데이터 구조 분석');
    console.log('='.repeat(80));

    // 숙박 데이터 분석
    console.log('\n🏨 숙박 데이터 구조:');
    console.log('-'.repeat(80));

    const [accommodations] = await connection.execute(`
      SELECT l.id, l.title, l.partner_id, p.business_name, l.price_from
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.category_id = 1857
      ORDER BY p.business_name, l.title
      LIMIT 20
    `);

    console.log('\n현재 listings 구조 (각 객실이 개별 listing):');
    accommodations.forEach(acc => {
      console.log(`   ID ${acc.id}: ${acc.title}`);
      console.log(`     → Partner ID: ${acc.partner_id} (${acc.business_name || 'NULL'})`);
      console.log(`     → Price: ₩${acc.price_from?.toLocaleString() || '0'}`);
    });

    // 호텔별 그룹핑
    const [hotelGroups] = await connection.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        COUNT(*) as room_count,
        MIN(l.price_from) as min_price,
        MAX(l.price_from) as max_price
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.category_id = 1857
      GROUP BY p.id, p.business_name
      ORDER BY p.business_name
    `);

    console.log('\n\n새로운 구조 (호텔별 그룹핑):');
    hotelGroups.forEach(hotel => {
      console.log(`   🏨 ${hotel.business_name || 'Unknown Hotel'} (Partner ID: ${hotel.partner_id})`);
      console.log(`      → ${hotel.room_count}개 객실`);
      console.log(`      → 가격 범위: ₩${hotel.min_price?.toLocaleString()} ~ ₩${hotel.max_price?.toLocaleString()}`);
    });

    // 렌트카 데이터 분석
    console.log('\n\n🚗 렌트카 데이터 구조:');
    console.log('-'.repeat(80));

    const [vendors] = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.vendor_code,
        v.vendor_name,
        COUNT(rv.id) as vehicle_count,
        MIN(rv.daily_rate_krw) as min_price,
        MAX(rv.daily_rate_krw) as max_price
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id
      GROUP BY v.id, v.vendor_code, v.vendor_name
      ORDER BY v.vendor_name
    `);

    console.log('\n렌트카 업체별 차량:');
    vendors.forEach(vendor => {
      console.log(`   🚗 ${vendor.vendor_name} (${vendor.vendor_code})`);
      console.log(`      → ${vendor.vehicle_count}대 차량`);
      console.log(`      → 가격 범위: ₩${vendor.min_price?.toLocaleString()} ~ ₩${vendor.max_price?.toLocaleString()}`);
    });

    // 필요한 변경사항
    console.log('\n\n' + '='.repeat(80));
    console.log('📝 필요한 변경사항:');
    console.log('='.repeat(80));

    console.log('\n1️⃣  숙박 카테고리:');
    console.log('   현재: 각 객실이 개별 카드로 표시');
    console.log('   변경: 호텔명 카드로 표시 → 클릭 시 해당 호텔의 모든 객실 표시');
    console.log('   필요 작업:');
    console.log('      - AccommodationCard: 호텔 정보 표시 (partner 기준)');
    console.log('      - AccommodationDetail: 선택한 호텔의 모든 객실 표시');
    console.log('      - API: /api/accommodations (호텔 목록)');
    console.log('      - API: /api/accommodations/[partnerId] (호텔의 객실 목록)');

    console.log('\n2️⃣  렌트카 카테고리:');
    console.log('   현재: rentcar_vehicles 테이블 사용');
    console.log('   변경: 렌트카 업체 카드로 표시 → 클릭 시 해당 업체의 모든 차량 표시');
    console.log('   필요 작업:');
    console.log('      - RentcarCard: 업체 정보 표시 (vendor 기준)');
    console.log('      - RentcarDetail: 선택한 업체의 모든 차량 표시');
    console.log('      - API: /api/rentcars (업체 목록)');
    console.log('      - API: /api/rentcars/[vendorId] (업체의 차량 목록)');

    console.log('\n3️⃣  데이터베이스 스키마:');
    console.log('   숙박: 현재 구조 유지 가능 (partner_id로 그룹핑)');
    console.log('   렌트카: 현재 구조 유지 가능 (vendor_id로 그룹핑)');

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

analyze();
