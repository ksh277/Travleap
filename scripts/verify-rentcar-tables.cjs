const { connect } = require('@planetscale/database');
require('dotenv').config();

async function verifyRentcarTables() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n' + '='.repeat(80));
  console.log('렌트카 전용 테이블 검증');
  console.log('='.repeat(80) + '\n');

  const tables = [
    'rentcar_vendors',
    'rentcar_vehicles',
    'rentcar_bookings',
    'rentcar_extras',
    'rentcar_vehicle_blocks',
    'rentcar_insurance_options'
  ];

  let allTablesExist = true;
  const existingTables = [];
  const missingTables = [];

  for (const tableName of tables) {
    try {
      const schema = await connection.execute(`DESCRIBE ${tableName}`);

      if (schema.rows && schema.rows.length > 0) {
        console.log(`✅ ${tableName} 테이블 존재`);
        console.log(`   컬럼 수: ${schema.rows.length}`);
        console.log(`   주요 컬럼: ${schema.rows.slice(0, 5).map(r => r.Field).join(', ')}...\n`);
        existingTables.push(tableName);

        // 샘플 데이터 개수 조회
        try {
          const count = await connection.execute(`SELECT COUNT(*) as cnt FROM ${tableName}`);
          if (count.rows && count.rows[0]) {
            console.log(`   데이터: ${count.rows[0].cnt}건\n`);
          }
        } catch (e) {
          // Count 실패는 무시
        }
      }
    } catch (error) {
      console.log(`❌ ${tableName} 테이블 없음`);
      console.log(`   오류: ${error.message}\n`);
      missingTables.push(tableName);
      allTablesExist = false;
    }
  }

  // 렌트카 벤더 샘플 조회
  if (existingTables.includes('rentcar_vendors')) {
    console.log('=' .repeat(80));
    console.log('렌트카 벤더 샘플 데이터\n');

    try {
      const vendors = await connection.execute(`
        SELECT id, user_id, business_name, contact_email, contact_phone
        FROM rentcar_vendors
        LIMIT 3
      `);

      if (vendors.rows && vendors.rows.length > 0) {
        console.log(`✅ ${vendors.rows.length}개 렌트카 벤더 발견:\n`);
        vendors.rows.forEach((v, i) => {
          console.log(`${i+1}. ID: ${v.id}, 업체명: ${v.business_name || '미등록'}`);
          console.log(`   유저 ID: ${v.user_id}, 이메일: ${v.contact_email || '-'}`);
          console.log(`   전화: ${v.contact_phone || '-'}\n`);
        });
      } else {
        console.log('⚠️  등록된 렌트카 벤더 없음\n');
      }
    } catch (error) {
      console.log(`❌ 벤더 조회 실패: ${error.message}\n`);
    }
  }

  // 렌트카 차량 샘플 조회
  if (existingTables.includes('rentcar_vehicles')) {
    console.log('='.repeat(80));
    console.log('렌트카 차량 샘플 데이터\n');

    try {
      const vehicles = await connection.execute(`
        SELECT id, vendor_id, model, brand, year, seats, price_per_day_krw
        FROM rentcar_vehicles
        LIMIT 5
      `);

      if (vehicles.rows && vehicles.rows.length > 0) {
        console.log(`✅ ${vehicles.rows.length}개 차량 발견:\n`);
        vehicles.rows.forEach((v, i) => {
          console.log(`${i+1}. ${v.brand} ${v.model} (${v.year}년)`);
          console.log(`   ${v.seats}인승, ${v.price_per_day_krw?.toLocaleString() || '0'}원/일`);
          console.log(`   벤더 ID: ${v.vendor_id}\n`);
        });
      } else {
        console.log('⚠️  등록된 차량 없음\n');
      }
    } catch (error) {
      console.log(`❌ 차량 조회 실패: ${error.message}\n`);
    }
  }

  // 렌트카 예약 샘플 조회
  if (existingTables.includes('rentcar_bookings')) {
    console.log('='.repeat(80));
    console.log('렌트카 예약 샘플 데이터\n');

    try {
      const bookings = await connection.execute(`
        SELECT id, booking_number, vehicle_id, customer_name, status, payment_status, total_price_krw
        FROM rentcar_bookings
        ORDER BY created_at DESC
        LIMIT 5
      `);

      if (bookings.rows && bookings.rows.length > 0) {
        console.log(`✅ ${bookings.rows.length}개 예약 발견:\n`);
        bookings.rows.forEach((b, i) => {
          console.log(`${i+1}. ${b.booking_number} - ${b.customer_name}`);
          console.log(`   상태: ${b.status}, 결제: ${b.payment_status}`);
          console.log(`   금액: ${b.total_price_krw?.toLocaleString() || '0'}원\n`);
        });
      } else {
        console.log('⚠️  예약 없음\n');
      }
    } catch (error) {
      console.log(`❌ 예약 조회 실패: ${error.message}\n`);
    }
  }

  // 렌트카 옵션 샘플 조회
  if (existingTables.includes('rentcar_extras')) {
    console.log('='.repeat(80));
    console.log('렌트카 옵션 샘플 데이터\n');

    try {
      const extras = await connection.execute(`
        SELECT id, vendor_id, name, category, price_krw, price_type
        FROM rentcar_extras
        WHERE is_active = 1
        LIMIT 5
      `);

      if (extras.rows && extras.rows.length > 0) {
        console.log(`✅ ${extras.rows.length}개 옵션 발견:\n`);
        extras.rows.forEach((e, i) => {
          console.log(`${i+1}. ${e.name} (${e.category})`);
          console.log(`   ${e.price_krw?.toLocaleString() || '0'}원 / ${e.price_type}\n`);
        });
      } else {
        console.log('⚠️  등록된 옵션 없음\n');
      }
    } catch (error) {
      console.log(`❌ 옵션 조회 실패: ${error.message}\n`);
    }
  }

  // 최종 결과
  console.log('='.repeat(80));
  if (allTablesExist) {
    console.log('🎉 모든 렌트카 테이블이 정상적으로 존재합니다!');
  } else {
    console.log(`⚠️  ${missingTables.length}개 테이블이 누락되었습니다:`);
    missingTables.forEach(t => console.log(`   - ${t}`));
  }
  console.log('='.repeat(80) + '\n');

  return allTablesExist;
}

verifyRentcarTables()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(error => {
    console.error('❌ 검증 중 오류:', error);
    process.exit(1);
  });
