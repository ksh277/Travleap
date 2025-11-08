require('dotenv').config();
const { connect } = require('@planetscale/database');

async function getJejuRentcarCredentials() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 제주렌트카 업체 계정 정보 조회...\n');

  try {
    // 1. rentcar_vendors 테이블에서 제주 렌트카 업체 조회
    const vendorsResult = await connection.execute(`
      SELECT id, vendor_code, business_name, brand_name,
             contact_email, contact_phone, status, created_at
      FROM rentcar_vendors
      WHERE business_name LIKE '%제주%' OR brand_name LIKE '%제주%'
         OR vendor_code LIKE '%JEJU%'
      ORDER BY created_at DESC
    `);

    console.log('=== 렌트카 벤더 정보 ===');
    if (vendorsResult.rows && vendorsResult.rows.length > 0) {
      vendorsResult.rows.forEach(vendor => {
        console.log(`\n✅ 벤더 ID: ${vendor.id}`);
        console.log(`   벤더 코드: ${vendor.vendor_code}`);
        console.log(`   사업자명: ${vendor.business_name || '-'}`);
        console.log(`   브랜드명: ${vendor.brand_name || '-'}`);
        console.log(`   이메일: ${vendor.contact_email}`);
        console.log(`   전화: ${vendor.contact_phone || '-'}`);
        console.log(`   상태: ${vendor.status}`);
        console.log(`   생성일: ${vendor.created_at}`);
      });
    } else {
      console.log('⚠️ 제주 렌트카 업체가 없습니다.');
    }

    // 2. 모든 렌트카 벤더 조회 (제주가 없을 경우 대비)
    console.log('\n\n=== 전체 렌트카 벤더 목록 ===');
    const allVendorsResult = await connection.execute(`
      SELECT id, vendor_code, business_name, brand_name,
             contact_email, status, created_at
      FROM rentcar_vendors
      ORDER BY created_at DESC
      LIMIT 10
    `);

    (allVendorsResult.rows || []).forEach(vendor => {
      console.log(`\n  ID ${vendor.id}: ${vendor.vendor_code}`);
      console.log(`    사업자명: ${vendor.business_name || '-'}`);
      console.log(`    브랜드명: ${vendor.brand_name || '-'}`);
      console.log(`    이메일: ${vendor.contact_email}`);
      console.log(`    상태: ${vendor.status}`);
    });

    // 3. 파트너 테이블에서 렌트카 계정 확인
    console.log('\n\n=== 파트너 테이블 렌트카 계정 ===');
    const partnersResult = await connection.execute(`
      SELECT id, company_name, email, partner_type, status, created_at
      FROM partners
      WHERE partner_type = 'rentcar'
      ORDER BY created_at DESC
    `);

    if (partnersResult.rows && partnersResult.rows.length > 0) {
      partnersResult.rows.forEach(partner => {
        console.log(`\n  ID ${partner.id}: ${partner.company_name}`);
        console.log(`    이메일: ${partner.email}`);
        console.log(`    상태: ${partner.status}`);
        console.log(`    생성일: ${partner.created_at}`);
      });
    }

    // 4. 차량 및 예약 통계
    console.log('\n\n=== 렌트카 데이터 통계 ===');
    const vehiclesResult = await connection.execute(`
      SELECT vendor_id, COUNT(*) as count
      FROM rentcar_vehicles
      GROUP BY vendor_id
    `);

    console.log('\n차량 수:');
    (vehiclesResult.rows || []).forEach(row => {
      console.log(`  벤더 ID ${row.vendor_id}: ${row.count}대`);
    });

    const bookingsResult = await connection.execute(`
      SELECT vendor_id, COUNT(*) as count
      FROM rentcar_bookings
      GROUP BY vendor_id
    `);

    console.log('\n예약 수:');
    (bookingsResult.rows || []).forEach(row => {
      console.log(`  벤더 ID ${row.vendor_id}: ${row.count}건`);
    });

  } catch (error) {
    console.error('❌ 조회 실패:', error);
    throw error;
  }
}

getJejuRentcarCredentials()
  .then(() => {
    console.log('\n\n✅ 조회 완료!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 실패:', err);
    process.exit(1);
  });
