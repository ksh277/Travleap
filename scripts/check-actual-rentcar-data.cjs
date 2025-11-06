const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🔍 Checking actual rentcar data...\n');

    // 1. rentcar_vehicles 테이블 확인 (실제 업체가 올린 차량들)
    console.log('📋 rentcar_vehicles 테이블:');
    const vehiclesResult = await connection.execute(`
      SELECT id, partner_id, name, model, brand, price_per_day, is_available, created_at
      FROM rentcar_vehicles
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (vehiclesResult.rows.length === 0) {
      console.log('  ❌ 차량이 없습니다.\n');
    } else {
      vehiclesResult.rows.forEach(row => {
        console.log(`  ID ${row.id}: ${row.brand} ${row.model} ${row.name}`);
        console.log(`    Partner ID: ${row.partner_id}, Price: ₩${row.price_per_day}/일`);
        console.log(`    Available: ${row.is_available}, Created: ${row.created_at}`);
      });
      console.log('');
    }

    // 2. listings 테이블의 rentcar 카테고리 확인
    console.log('📋 listings 테이블 (category = "rentcar"):');
    const listingsRentcarResult = await connection.execute(`
      SELECT id, title, category, category_id, price_from, partner_id, is_published, is_active, created_at
      FROM listings
      WHERE category = 'rentcar'
      ORDER BY created_at DESC
    `);

    if (listingsRentcarResult.rows.length === 0) {
      console.log('  ❌ category="rentcar"인 상품이 없습니다.\n');
    } else {
      listingsRentcarResult.rows.forEach(row => {
        console.log(`  ID ${row.id}: ${row.title}`);
        console.log(`    Category: ${row.category}, Category ID: ${row.category_id}`);
        console.log(`    Price: ${row.price_from}, Partner ID: ${row.partner_id}`);
        console.log(`    Published: ${row.is_published}, Active: ${row.is_active}`);
        console.log(`    Created: ${row.created_at}`);
      });
      console.log('');
    }

    // 3. listings 테이블의 category_id = 1856 확인
    console.log('📋 listings 테이블 (category_id = 1856):');
    const listingsCatIdResult = await connection.execute(`
      SELECT id, title, category, category_id, price_from, partner_id, is_published, is_active, created_at
      FROM listings
      WHERE category_id = 1856
      ORDER BY created_at DESC
    `);

    if (listingsCatIdResult.rows.length === 0) {
      console.log('  ❌ category_id=1856인 상품이 없습니다.\n');
    } else {
      listingsCatIdResult.rows.forEach(row => {
        console.log(`  ID ${row.id}: ${row.title}`);
        console.log(`    Category: "${row.category}" (should be "rentcar")`);
        console.log(`    Price: ${row.price_from}, Partner ID: ${row.partner_id}`);
        console.log(`    Published: ${row.is_published}, Active: ${row.is_active}`);
        console.log(`    Created: ${row.created_at}`);
      });
      console.log('');
    }

    // 4. rentcar partners 확인
    console.log('📋 Rentcar partners:');
    const partnersResult = await connection.execute(`
      SELECT id, business_name, email, status, created_at
      FROM partners
      WHERE partner_type = 'rentcar'
      ORDER BY created_at DESC
    `);

    partnersResult.rows.forEach(row => {
      console.log(`  Partner ID ${row.id}: ${row.business_name}`);
      console.log(`    Email: ${row.email}, Status: ${row.status}`);
      console.log(`    Created: ${row.created_at}`);
    });

    console.log('\n💡 분석:');
    console.log('  - rentcar_vehicles: 실제 업체가 등록한 차량 데이터');
    console.log('  - listings (category="rentcar"): 프론트엔드에 표시될 상품');
    console.log('  - 두 테이블이 연결되어야 렌트카 결제가 작동합니다.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
