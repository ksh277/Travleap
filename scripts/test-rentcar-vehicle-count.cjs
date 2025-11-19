/**
 * 렌터카 업체별 차량 개수 계산 테스트
 * COUNT vs SUM(stock) 비교
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function testVehicleCount() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🚗 렌터카 업체별 차량 개수 계산 테스트\n');

    // 기존 방식 (COUNT) - 차량 종류의 수
    console.log('❌ 기존 방식 (COUNT - 차량 종류 수만 카운트):');
    console.log('=' + '='.repeat(80));

    const oldResult = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.business_name,
        COUNT(rv.id) as vehicle_count_old
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1
      WHERE v.status = 'active'
      GROUP BY v.id, v.business_name
      ORDER BY vehicle_count_old DESC
      LIMIT 10
    `);

    oldResult.rows.forEach(vendor => {
      console.log(`  ${vendor.business_name}: ${vendor.vehicle_count_old}대`);
    });

    console.log('\n✅ 수정된 방식 (SUM(stock) - 실제 재고 합산):');
    console.log('=' + '='.repeat(80));

    // 수정된 방식 (SUM) - 실제 재고 합산
    const newResult = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.business_name,
        SUM(COALESCE(rv.stock, 1)) as vehicle_count_new
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1
      WHERE v.status = 'active'
      GROUP BY v.id, v.business_name
      ORDER BY vehicle_count_new DESC
      LIMIT 10
    `);

    newResult.rows.forEach(vendor => {
      console.log(`  ${vendor.business_name}: ${vendor.vehicle_count_new}대`);
    });

    // 비교 테이블
    console.log('\n📊 비교 (기존 vs 수정):');
    console.log('=' + '='.repeat(80));
    console.log('업체명'.padEnd(30) + '기존(종류 수)'.padEnd(15) + '수정(재고 합산)'.padEnd(15) + '차이');
    console.log('-'.repeat(80));

    for (let i = 0; i < Math.min(oldResult.rows.length, newResult.rows.length); i++) {
      const oldVendor = oldResult.rows[i];
      const newVendor = newResult.rows.find(v => v.vendor_id === oldVendor.vendor_id);

      if (newVendor) {
        const diff = newVendor.vehicle_count_new - oldVendor.vehicle_count_old;
        const diffStr = diff > 0 ? `+${diff}대 증가` : (diff < 0 ? `${diff}대 감소` : '변화 없음');

        console.log(
          `${oldVendor.business_name.padEnd(30)}${String(oldVendor.vehicle_count_old).padEnd(15)}${String(newVendor.vehicle_count_new).padEnd(15)}${diffStr}`
        );
      }
    }

    // 특정 업체의 상세 정보 확인
    console.log('\n🔍 드림렌트카 / 제주 렌터카 상세 확인:');
    console.log('=' + '='.repeat(80));

    const vendors = newResult.rows.filter(v =>
      v.business_name.includes('드림') || v.business_name.includes('제주')
    );

    for (const vendor of vendors) {
      console.log(`\n📦 ${vendor.business_name} (ID: ${vendor.vendor_id})`);
      console.log('  총 차량: ' + vendor.vehicle_count_new + '대\n');

      // 해당 업체의 차량 종류별 재고 확인
      const vehiclesResult = await connection.execute(`
        SELECT
          brand,
          model,
          display_name,
          stock
        FROM rentcar_vehicles
        WHERE vendor_id = ? AND is_active = 1
        ORDER BY brand, model
      `, [vendor.vendor_id]);

      console.log('  차량 종류별 재고:');
      vehiclesResult.rows.forEach(v => {
        console.log(`    - ${v.brand} ${v.model} (${v.display_name}): ${v.stock || 1}대`);
      });
    }

    console.log('\n✅ 테스트 완료!\n');

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    process.exit(0);
  }
}

testVehicleCount();
