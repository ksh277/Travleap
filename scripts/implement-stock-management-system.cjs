/**
 * 재고 관리 시스템 구현 및 점검 스크립트
 *
 * 작업:
 * 1. listings 테이블에 stock 컬럼 존재 확인 (없으면 추가)
 * 2. 재고 차감 시스템 점검 (예약 시 재고 감소)
 * 3. 재고 복구 시스템 점검 (예약 만료 시 재고 증가)
 * 4. 렌트카/숙박 재고 시스템 동작 확인
 */

const { connect } = require('@planetscale/database');
const connection = connect({ url: process.env.DATABASE_URL });

async function checkListingsStockColumn() {
  console.log('1️⃣ listings 테이블 stock 컬럼 확인...\n');

  try {
    // listings 테이블 스키마 조회
    const result = await connection.execute(
      `DESCRIBE listings`
    );

    const columns = result.rows || [];
    const stockColumn = columns.find(col => col.Field === 'stock');

    if (stockColumn) {
      console.log('✅ stock 컬럼 존재:', stockColumn);
      return true;
    } else {
      console.log('❌ stock 컬럼 없음 - 추가 필요');
      console.log('\n추가할 SQL:');
      console.log('ALTER TABLE listings ADD COLUMN stock INT DEFAULT 0 COMMENT \'재고 수량\';');
      return false;
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
    return false;
  }
}

async function checkStockDeductionSystem() {
  console.log('\n2️⃣ 재고 차감 시스템 점검...\n');

  try {
    // 예약 생성 API 파일들 확인
    const fs = require('fs');
    const path = require('path');

    const bookingAPIs = [
      'api/bookings/create.js',
      'api/rentcar/bookings/create.js',
      'api/vendor/lodging/bookings.js'
    ];

    console.log('📋 예약 생성 API 파일 점검:');
    for (const apiPath of bookingAPIs) {
      const fullPath = path.join(process.cwd(), apiPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // 재고 차감 로직 확인
        const hasStockDeduction = content.includes('stock') &&
          (content.includes('UPDATE') || content.includes('SET stock'));

        console.log(`  ${apiPath}:`);
        console.log(`    파일 존재: ✅`);
        console.log(`    재고 차감 로직: ${hasStockDeduction ? '✅ 발견' : '❌ 없음'}`);

        if (!hasStockDeduction) {
          console.log(`    ⚠️  재고 차감 로직 추가 필요!`);
        }
      } else {
        console.log(`  ${apiPath}: ❌ 파일 없음`);
      }
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

async function checkStockRestorationSystem() {
  console.log('\n3️⃣ 재고 복구 시스템 점검...\n');

  try {
    const fs = require('fs');
    const path = require('path');

    // Expiry worker 파일들 확인
    const workerFiles = [
      'workers/expireBookings.ts',
      'workers/lodgingBookingExpiry.ts'
    ];

    console.log('⏰ 예약 만료 Worker 파일 점검:');
    for (const workerPath of workerFiles) {
      const fullPath = path.join(process.cwd(), workerPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // 재고 복구 로직 확인
        const hasStockRestoration = content.includes('stock') &&
          (content.includes('UPDATE') || content.includes('SET stock') || content.includes('stock + 1'));

        console.log(`  ${workerPath}:`);
        console.log(`    파일 존재: ✅`);
        console.log(`    재고 복구 로직: ${hasStockRestoration ? '✅ 발견' : '❌ 없음'}`);

        if (!hasStockRestoration) {
          console.log(`    ⚠️  재고 복구 로직 추가 필요!`);
        }
      } else {
        console.log(`  ${workerPath}: ❌ 파일 없음`);
      }
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

async function checkRentcarStockSystem() {
  console.log('\n4️⃣ 렌트카 재고 시스템 점검...\n');

  try {
    // rentcar_vehicles 테이블 stock 컬럼 확인
    const result = await connection.execute(
      `DESCRIBE rentcar_vehicles`
    );

    const columns = result.rows || [];
    const stockColumn = columns.find(col => col.Field === 'stock');

    console.log('📊 rentcar_vehicles 테이블:');
    if (stockColumn) {
      console.log('  ✅ stock 컬럼 존재:', stockColumn);

      // 실제 재고 데이터 확인
      const stockData = await connection.execute(
        `SELECT id, name, brand, model, stock,
         (SELECT COUNT(*) FROM rentcar_bookings rb WHERE rb.vehicle_id = rv.id AND rb.status = 'confirmed') as active_bookings
         FROM rentcar_vehicles rv
         LIMIT 5`
      );

      console.log('\n  📈 샘플 재고 데이터:');
      if (stockData.rows && stockData.rows.length > 0) {
        stockData.rows.forEach(row => {
          console.log(`    차량 ${row.id}: ${row.brand} ${row.model} - 재고: ${row.stock}, 활성 예약: ${row.active_bookings}`);
        });
      } else {
        console.log('    데이터 없음');
      }
    } else {
      console.log('  ❌ stock 컬럼 없음');
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

async function generateStockManagementReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 재고 관리 시스템 종합 보고서');
  console.log('='.repeat(60) + '\n');

  const hasListingsStock = await checkListingsStockColumn();
  await checkStockDeductionSystem();
  await checkStockRestorationSystem();
  await checkRentcarStockSystem();

  console.log('\n' + '='.repeat(60));
  console.log('✅ 점검 완료');
  console.log('='.repeat(60));

  console.log('\n📋 다음 단계:');
  if (!hasListingsStock) {
    console.log('  1. ⚠️  listings 테이블에 stock 컬럼 추가 필요');
  }
  console.log('  2. ✅ 통합 재고 API 생성 완료 (/api/vendor/stock)');
  console.log('  3. ⏳ 6개 카테고리 벤더 대시보드에 재고 관리 UI 추가 필요');
  console.log('  4. ⏳ 예약 생성 시 재고 차감 로직 구현 필요');
  console.log('  5. ⏳ 예약 만료 시 재고 복구 로직 구현 필요');

  process.exit(0);
}

// 실행
generateStockManagementReport().catch(error => {
  console.error('❌ 치명적 오류:', error);
  process.exit(1);
});
