/**
 * 렌트카 차량 테이블 단순화 마이그레이션
 *
 * 변경사항:
 * 1. hourly_rate_krw 컬럼 추가
 * 2. 복잡한 필드들 NULL 허용으로 변경
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

async function simplifyRentcarVehicles() {
  console.log('🚀 렌트카 차량 테이블 단순화 시작...\n');

  const config = {
    url: process.env.DATABASE_URL
  };

  if (!config.url) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const db = connect(config);

  try {
    // 1. hourly_rate_krw 컬럼 추가
    console.log('📝 1. hourly_rate_krw 컬럼 추가...');
    try {
      await db.execute(`
        ALTER TABLE rentcar_vehicles
        ADD COLUMN hourly_rate_krw INT NULL COMMENT '시간당 요금'
        AFTER daily_rate_krw
      `);
      console.log('✅ hourly_rate_krw 컬럼 추가 완료');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column')) {
        console.log('ℹ️  hourly_rate_krw 컬럼 이미 존재');
      } else {
        throw error;
      }
    }

    // 2. 복잡한 필드들 NULL 허용으로 변경
    console.log('\n📝 2. 필드들 NULL 허용으로 변경...');

    const columnsToModify = [
      { name: 'vehicle_class', type: "ENUM('compact', 'midsize', 'fullsize', 'luxury', 'suv', 'van', 'electric') NULL" },
      { name: 'fuel_type', type: "ENUM('gasoline', 'diesel', 'electric', 'hybrid') NULL" },
      { name: 'transmission', type: "ENUM('manual', 'automatic') NULL" },
      { name: 'seating_capacity', type: 'INT NULL' },
      { name: 'mileage_limit_per_day', type: 'INT NULL' },
      { name: 'unlimited_mileage', type: 'BOOLEAN NULL' },
      { name: 'deposit_amount_krw', type: 'INT NULL' }
    ];

    for (const col of columnsToModify) {
      try {
        await db.execute(`
          ALTER TABLE rentcar_vehicles
          MODIFY COLUMN ${col.name} ${col.type}
        `);
        console.log(`  ✅ ${col.name} → NULL 허용`);
      } catch (error) {
        console.log(`  ℹ️  ${col.name} 수정 실패 (이미 NULL 허용일 수 있음)`);
      }
    }

    // 3. 기존 데이터에 hourly_rate_krw 값 설정 (daily_rate / 24 기준)
    console.log('\n📝 3. 기존 차량에 시간당 요금 자동 계산...');
    await db.execute(`
      UPDATE rentcar_vehicles
      SET hourly_rate_krw = CEIL(daily_rate_krw / 24)
      WHERE hourly_rate_krw IS NULL AND daily_rate_krw IS NOT NULL
    `);
    console.log('✅ 기존 차량 시간당 요금 설정 완료');

    // 4. 테이블 구조 확인
    console.log('\n📋 4. 최종 테이블 구조 확인...\n');
    const result = await db.execute('DESCRIBE rentcar_vehicles');

    const importantFields = [
      'display_name',
      'daily_rate_krw',
      'hourly_rate_krw',
      'vehicle_class',
      'transmission',
      'seating_capacity',
      'fuel_type'
    ];

    console.log('주요 필드 상태:');
    result.rows.forEach(row => {
      if (importantFields.includes(row.Field)) {
        const nullable = row.Null === 'YES' ? '✅ NULL 허용' : '❌ NOT NULL';
        console.log(`  ${row.Field.padEnd(25)} ${row.Type.padEnd(30)} ${nullable}`);
      }
    });

    console.log('\n✨ 마이그레이션 완료!');
    console.log('\n📌 단순화된 필수 필드:');
    console.log('  - display_name (차량명)');
    console.log('  - daily_rate_krw (일일 요금)');
    console.log('  - hourly_rate_krw (시간당 요금)');

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    process.exit(1);
  }

  process.exit(0);
}

simplifyRentcarVehicles();
