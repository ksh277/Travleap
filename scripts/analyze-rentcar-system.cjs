/**
 * 렌트카 시스템 완전 분석
 * GPT 사양서 vs 현재 구현 비교
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function analyzeRentcarSystem() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n' + '='.repeat(80));
  console.log('렌트카 시스템 완전 분석 - GPT 사양서 vs 현재 구현');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. 테이블 존재 여부 확인
    console.log('[1] 데이터베이스 테이블 존재 여부 확인:');
    console.log('-'.repeat(80));

    const requiredTables = [
      'rentcar_vendors',
      'rentcar_vehicles',
      'rentcar_rentals',
      'rentcar_vehicle_blocks',
      'rentcar_insurance_plans',    // GPT 사양
      'rentcar_fee_rules',          // GPT 사양
      'rentcar_vehicle_assets',     // GPT 사양
      'rentcar_handover_records',   // GPT 사양
      'rentcar_audit_logs'          // GPT 사양
    ];

    for (const table of requiredTables) {
      const result = await connection.execute(
        `SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ?`,
        [table]
      );
      const exists = result.rows?.[0]?.count > 0;
      console.log(`  ${exists ? '✅' : '❌'} ${table.padEnd(35)} ${exists ? '존재' : '❌ 없음'}`);
    }

    // 2. 핵심 컬럼 존재 확인
    console.log('\n[2] rentcar_rentals 핵심 컬럼 확인:');
    console.log('-'.repeat(80));

    const rentalColumns = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rentcar_rentals'
      ORDER BY ORDINAL_POSITION
    `);

    const requiredRentalColumns = [
      'pickup_datetime',
      'return_datetime',
      'actual_pickup_datetime',
      'actual_return_datetime',
      'hourly_rate',
      'daily_rate',
      'total_hours',
      'base_amount',
      'deposit_amount',
      'insurance_amount',
      'extra_fees',
      'total_amount',
      'payment_status',
      'rental_status'
    ];

    const existingColumns = rentalColumns.rows?.map(r => r.COLUMN_NAME) || [];

    requiredRentalColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col.padEnd(30)} ${exists ? '존재' : '❌ 없음'}`);
    });

    // 3. 벤더 대시보드 상태 확인
    console.log('\n[3] 예약 상태(rental_status) 값 확인:');
    console.log('-'.repeat(80));

    const statusResult = await connection.execute(`
      SELECT rental_status, COUNT(*) as count
      FROM rentcar_rentals
      GROUP BY rental_status
    `);

    const requiredStatuses = ['pending', 'confirmed', 'picked_up', 'returned', 'completed', 'cancelled'];

    if (statusResult.rows && statusResult.rows.length > 0) {
      statusResult.rows.forEach(row => {
        console.log(`  ✅ ${row.rental_status.padEnd(20)} ${row.count}건`);
      });
    } else {
      console.log('  ⚠️  예약 데이터 없음');
    }

    // 4. 차량 차단(blocks) 테이블 확인
    console.log('\n[4] 차량 차단 시스템 확인:');
    console.log('-'.repeat(80));

    try {
      const blocksResult = await connection.execute(`
        SELECT COUNT(*) as count FROM rentcar_vehicle_blocks
      `);
      console.log(`  ✅ rentcar_vehicle_blocks 테이블 존재: ${blocksResult.rows?.[0]?.count || 0}건`);

      const blocksColumns = await connection.execute(`
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rentcar_vehicle_blocks'
      `);

      const requiredBlockColumns = ['vehicle_id', 'start_datetime', 'end_datetime', 'block_type', 'reason', 'is_active'];
      const blockCols = blocksColumns.rows?.map(r => r.COLUMN_NAME) || [];

      requiredBlockColumns.forEach(col => {
        const exists = blockCols.includes(col);
        console.log(`    ${exists ? '✅' : '❌'} ${col}`);
      });
    } catch (e) {
      console.log('  ❌ rentcar_vehicle_blocks 테이블 없음');
    }

    // 5. API 엔드포인트 체크리스트
    console.log('\n[5] 필수 API 엔드포인트 체크리스트:');
    console.log('-'.repeat(80));

    const requiredAPIs = [
      'GET /api/vendor/rentals (오늘 예약 리스트)',
      'POST /api/vendor/rentals/:id/check-in (체크인)',
      'POST /api/vendor/rentals/:id/check-out (체크아웃)',
      'POST /api/vendor/vehicle-blocks (차단 등록)',
      'PATCH /api/vendor/vehicle-blocks/:id (차단 해제)',
      'POST /api/vendor/external-booking (외부예약)',
      'GET /api/vendor/availability-calendar (가용성 캘린더)',
      'POST /api/vendor/fee-rules (수수료 규칙)',
      'GET /api/vendor/settlements (정산 리포트)'
    ];

    console.log('  ⚠️  아래 API는 파일 시스템 확인 필요:');
    requiredAPIs.forEach(api => console.log(`    📋 ${api}`));

    console.log('\n' + '='.repeat(80));
    console.log('분석 완료');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n✗ 오류 발생:', error.message);
    console.error(error.stack);
  }
}

analyzeRentcarSystem();
