const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function checkInsurance() {
  try {
    console.log('🔍 렌트카 보험 데이터 확인 중...\n');

    // 1. 테이블 스키마 확인
    const schema = await connection.execute('DESCRIBE rentcar_insurance');
    console.log('📋 rentcar_insurance 테이블 구조:');
    schema.rows.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));

    // 2. 모든 보험 조회
    const insurances = await connection.execute(
      'SELECT * FROM rentcar_insurance'
    );

    console.log(`✅ 총 ${insurances.rows.length}개의 보험 상품 발견\n`);

    if (insurances.rows.length === 0) {
      console.log('⚠️  등록된 보험 상품이 없습니다.');
      console.log('\n필요한 액션:');
      console.log('- vendor별 보험 상품 생성 필요');
    } else {
      insurances.rows.forEach(ins => {
        console.log(`ID: ${ins.id}, Vendor: ${ins.vendor_id}, 이름: ${ins.name}`);
        console.log(`  시간당: ${ins.hourly_rate_krw}원, 보장액: ${ins.coverage_amount_krw}원, 활성: ${ins.is_active}`);
      });
    }

    // 2. 렌트카 업체 조회
    console.log('\n🏢 렌트카 업체 목록:');
    const vendors = await connection.execute(
      'SELECT id, business_name, brand_name FROM rentcar_vendors'
    );

    vendors.rows.forEach(v => {
      console.log(`  - ID ${v.id}: ${v.business_name} (${v.brand_name})`);
    });

    // 3. 차량 553, 554의 vendor 확인
    console.log('\n🚗 차량 정보:');
    const vehicles = await connection.execute(
      'SELECT id, vendor_id, display_name FROM rentcar_vehicles WHERE id IN (553, 554)'
    );
    vehicles.rows.forEach(v => {
      console.log(`  - 차량 ID ${v.id}: ${v.display_name} (vendor_id: ${v.vendor_id})`);
    });

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkInsurance();
