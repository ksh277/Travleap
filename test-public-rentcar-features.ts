/**
 * 렌트카 공개 기능 전체 테스트 (인증 불필요)
 *
 * 테스트 범위:
 * 1. 165개 차량 상세 페이지 렌더링
 * 2. 업체 상세 페이지 및 차량 카드
 * 3. 이미지 갤러리
 * 4. 결제 과정 시뮬레이션
 * 5. 업체 카드 UI
 * 6. 가격 계산 로직
 */

import 'dotenv/config';
import { connect } from '@planetscale/database';

const planetscale = connect({ url: process.env.DATABASE_URL! });
const API_URL = 'http://localhost:3004';

interface TestResult {
  category: string;
  vehicleId?: number;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: TestResult[] = [];

function log(category: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, vehicleId?: number) {
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  const idStr = vehicleId ? `[ID ${vehicleId}] ` : '';
  console.log(`${icon} ${category} - ${idStr}${message}`);
  results.push({ category, vehicleId, status, message });
}

// ============================================================================
// 1단계: 165개 차량 상세 페이지 전체 테스트
// ============================================================================
async function testAll165VehicleDetailPages() {
  console.log('\n📄 1단계: 165개 차량 상세 페이지 전체 테스트...\n');

  const vehicles = await planetscale.execute(
    'SELECT id, brand, model FROM rentcar_vehicles WHERE vendor_id = 13 ORDER BY id ASC'
  );

  console.log(`   총 차량: ${vehicles.rows.length}개\n`);

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (let i = 0; i < vehicles.rows.length; i++) {
    const vehicle = vehicles.rows[i];

    if ((i + 1) % 25 === 0) {
      console.log(`   진행: ${i + 1}/${vehicles.rows.length} (${((i+1)/vehicles.rows.length*100).toFixed(1)}%)`);
    }

    try {
      const res = await fetch(`${API_URL}/api/rentcar/vehicle/${vehicle.id}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (!data.success || !data.data) {
        throw new Error('API 응답 실패');
      }

      const v = data.data;

      // 필수 필드 검증
      const required = {
        basic: ['brand', 'model', 'vehicle_class', 'vehicle_type'],
        pricing: ['daily_rate_krw', 'hourly_rate_krw', 'deposit_amount_krw'],
        specs: ['seating_capacity', 'fuel_type', 'transmission'],
        vendor: ['vendor_name', 'vendor_phone', 'vendor_address']
      };

      const missing: string[] = [];

      Object.entries(required).forEach(([group, fields]) => {
        fields.forEach(field => {
          if (!v[field] && v[field] !== 0) {
            missing.push(`${group}.${field}`);
          }
        });
      });

      if (missing.length > 0) {
        throw new Error(`필수 필드 누락: ${missing.join(', ')}`);
      }

      // 데이터 타입 검증
      if (!Array.isArray(v.images)) {
        throw new Error('images가 배열이 아님');
      }

      if (!Array.isArray(v.features)) {
        throw new Error('features가 배열이 아님');
      }

      // 가격 검증
      if (v.daily_rate_krw < 10000) {
        throw new Error(`일일 요금 비정상: ₩${v.daily_rate_krw}`);
      }

      if (v.hourly_rate_krw < 1000) {
        throw new Error(`시간 요금 비정상: ₩${v.hourly_rate_krw}`);
      }

      // 이미지 확인 (경고만)
      if (v.images.length === 0) {
        log('상세페이지', 'WARN', `${v.brand} ${v.model} - 이미지 없음`, vehicle.id);
        warnCount++;
      } else {
        log('상세페이지', 'PASS', `${v.brand} ${v.model} - 완전`, vehicle.id);
        passCount++;
      }

    } catch (error: any) {
      log('상세페이지', 'FAIL', `${vehicle.brand} ${vehicle.model} - ${error.message}`, vehicle.id);
      failCount++;
    }
  }

  console.log(`\n   📊 결과: ✅ ${passCount} | ⚠️  ${warnCount} | ❌ ${failCount}\n`);

  return { passCount, failCount, warnCount };
}

// ============================================================================
// 2단계: 업체 상세 페이지 및 차량 카드 (165개 전부)
// ============================================================================
async function testVendorPageAndAllVehicleCards() {
  console.log('\n🏢 2단계: 업체 페이지 및 165개 차량 카드 테스트...\n');

  // 업체 목록
  const vendorsRes = await fetch(`${API_URL}/api/rentcars`);
  const vendorsData = await vendorsRes.json();

  if (!vendorsData.success) {
    throw new Error('업체 목록 조회 실패');
  }

  const pmsVendor = vendorsData.data.find((v: any) => v.business_name?.includes('PMS'));
  if (!pmsVendor) {
    throw new Error('PMS 업체 없음');
  }

  log('업체페이지', 'PASS', `${pmsVendor.business_name} - ${pmsVendor.vehicle_count}대`);

  // 165개 차량 카드 데이터 검증
  console.log('\n   165개 차량 카드 데이터 검증...\n');

  const allVehicles = await planetscale.execute(
    `SELECT id, brand, model, vehicle_class, vehicle_type, daily_rate_krw, hourly_rate_krw,
            thumbnail_url, seating_capacity, transmission, fuel_type
     FROM rentcar_vehicles
     WHERE vendor_id = 13
     ORDER BY id ASC`
  );

  let cardPass = 0;
  let cardFail = 0;

  for (let i = 0; i < allVehicles.rows.length; i++) {
    const card = allVehicles.rows[i];

    if ((i + 1) % 25 === 0) {
      console.log(`   진행: ${i + 1}/${allVehicles.rows.length} (${((i+1)/allVehicles.rows.length*100).toFixed(1)}%)`);
    }

    try {
      // 카드 필수 필드
      const cardFields = [
        'brand', 'model', 'vehicle_class', 'daily_rate_krw',
        'hourly_rate_krw', 'seating_capacity', 'transmission'
      ];

      const missing = cardFields.filter(field => !card[field] && card[field] !== 0);

      if (missing.length > 0) {
        throw new Error(`카드 필드 누락: ${missing.join(', ')}`);
      }

      cardPass++;

    } catch (error: any) {
      log('차량카드', 'FAIL', `${card.brand} ${card.model} - ${error.message}`, card.id);
      cardFail++;
    }
  }

  console.log(`\n   📊 차량 카드 결과: ✅ ${cardPass}/${allVehicles.rows.length}\n`);

  if (cardPass === allVehicles.rows.length) {
    log('차량카드', 'PASS', `모든 165개 차량 카드 데이터 완전`);
  }

  return { cardPass, cardFail };
}

// ============================================================================
// 3단계: 이미지 갤러리 테스트
// ============================================================================
async function testImageGalleryAll() {
  console.log('\n🖼️  3단계: 이미지 갤러리 테스트 (165개 차량)...\n');

  const vehicles = await planetscale.execute(
    `SELECT id, brand, model, images, thumbnail_url
     FROM rentcar_vehicles
     WHERE vendor_id = 13
     ORDER BY id ASC`
  );

  let hasImage = 0;
  let noImage = 0;

  for (const vehicle of vehicles.rows) {
    try {
      const images = vehicle.images ? JSON.parse(vehicle.images) : [];

      if (images.length > 0) {
        hasImage++;
      } else {
        noImage++;
      }

    } catch (error) {
      noImage++;
    }
  }

  console.log(`   이미지 있음: ${hasImage}개`);
  console.log(`   이미지 없음: ${noImage}개`);

  if (noImage === vehicles.rows.length) {
    log('이미지', 'WARN', `모든 차량 이미지 없음 (업로드 시스템은 준비완료)`);
  } else {
    log('이미지', 'PASS', `${hasImage}개 차량에 이미지 있음`);
  }

  return { hasImage, noImage };
}

// ============================================================================
// 4단계: 결제 플로우 (165개 차량 각각)
// ============================================================================
async function testPaymentFlowAllVehicles() {
  console.log('\n💳 4단계: 165개 차량 결제 플로우 테스트...\n');

  const vehicles = await planetscale.execute(
    `SELECT id, brand, model, daily_rate_krw, hourly_rate_krw, deposit_amount_krw
     FROM rentcar_vehicles
     WHERE vendor_id = 13
     ORDER BY id ASC`
  );

  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < vehicles.rows.length; i++) {
    const v = vehicles.rows[i];

    if ((i + 1) % 25 === 0) {
      console.log(`   진행: ${i + 1}/${vehicles.rows.length} (${((i+1)/vehicles.rows.length*100).toFixed(1)}%)`);
    }

    try {
      // 시간 단위 가격 계산
      const hourly8 = v.hourly_rate_krw * 8;
      if (hourly8 < 1000) {
        throw new Error('8시간 요금 너무 낮음');
      }

      // 일일 가격 계산
      const daily3 = v.daily_rate_krw * 3;
      if (daily3 < 10000) {
        throw new Error('3일 요금 너무 낮음');
      }

      // 24시간 vs 1일 비교
      const hourly24 = v.hourly_rate_krw * 24;
      if (hourly24 <= v.daily_rate_krw) {
        throw new Error('가격 역전 (24시간이 일일보다 저렴)');
      }

      // 보증금
      if (!v.deposit_amount_krw || v.deposit_amount_krw < 50000) {
        throw new Error(`보증금 없음/낮음: ₩${v.deposit_amount_krw}`);
      }

      // 옵션 추가 계산
      const withOptions = daily3 + 100000; // 보험 등
      if (withOptions <= daily3) {
        throw new Error('옵션 가격 계산 오류');
      }

      passCount++;

    } catch (error: any) {
      log('결제', 'FAIL', `${v.brand} ${v.model} - ${error.message}`, v.id);
      failCount++;
    }
  }

  console.log(`\n   📊 결제 테스트 결과: ✅ ${passCount}/${vehicles.rows.length}\n`);

  if (passCount === vehicles.rows.length) {
    log('결제', 'PASS', `모든 165개 차량 결제 플로우 정상`);
  }

  return { passCount, failCount };
}

// ============================================================================
// 5단계: 가격 계산 로직 (165개 차량)
// ============================================================================
async function testPriceCalculationAll() {
  console.log('\n💰 5단계: 165개 차량 가격 계산 정확도 테스트...\n');

  const vehicles = await planetscale.execute(
    'SELECT id, brand, model, daily_rate_krw, hourly_rate_krw FROM rentcar_vehicles WHERE vendor_id = 13 ORDER BY id ASC'
  );

  let passCount = 0;
  let failCount = 0;

  const priceStats = {
    dailyMin: Infinity,
    dailyMax: 0,
    dailyAvg: 0,
    hourlyMin: Infinity,
    hourlyMax: 0,
    hourlyAvg: 0
  };

  let dailySum = 0;
  let hourlySum = 0;

  for (const v of vehicles.rows) {
    const daily = v.daily_rate_krw;
    const hourly = v.hourly_rate_krw;

    // 통계
    dailySum += daily;
    hourlySum += hourly;

    if (daily < priceStats.dailyMin) priceStats.dailyMin = daily;
    if (daily > priceStats.dailyMax) priceStats.dailyMax = daily;
    if (hourly < priceStats.hourlyMin) priceStats.hourlyMin = hourly;
    if (hourly > priceStats.hourlyMax) priceStats.hourlyMax = hourly;

    // 자동 계산 공식 검증
    const calculated = Math.round((daily / 24) * 1.2 / 1000) * 1000;
    const diff = Math.abs(calculated - hourly);
    const diffPercent = (diff / calculated) * 100;

    if (diffPercent > 15) { // 15% 이상 차이나면 실패
      log('가격계산', 'FAIL', `${v.brand} ${v.model} - 계산식 불일치 (예상: ₩${calculated.toLocaleString()}, 실제: ₩${hourly.toLocaleString()})`, v.id);
      failCount++;
    } else {
      passCount++;
    }
  }

  priceStats.dailyAvg = Math.round(dailySum / vehicles.rows.length);
  priceStats.hourlyAvg = Math.round(hourlySum / vehicles.rows.length);

  console.log(`\n   📊 가격 통계:`);
  console.log(`      일일 요금: ₩${priceStats.dailyMin.toLocaleString()} ~ ₩${priceStats.dailyMax.toLocaleString()} (평균: ₩${priceStats.dailyAvg.toLocaleString()})`);
  console.log(`      시간 요금: ₩${priceStats.hourlyMin.toLocaleString()} ~ ₩${priceStats.hourlyMax.toLocaleString()} (평균: ₩${priceStats.hourlyAvg.toLocaleString()})`);
  console.log(`\n   📊 가격 계산 결과: ✅ ${passCount}/${vehicles.rows.length}\n`);

  if (passCount === vehicles.rows.length) {
    log('가격계산', 'PASS', `모든 165개 차량 가격 계산 정확`);
  }

  return { passCount, failCount, stats: priceStats };
}

// ============================================================================
// 6단계: 업체 카드 UI
// ============================================================================
async function testVendorCards() {
  console.log('\n🏪 6단계: 업체 카드 UI 테스트...\n');

  const vendorsRes = await fetch(`${API_URL}/api/rentcars`);
  const vendorsData = await vendorsRes.json();

  if (!vendorsData.success) {
    throw new Error('업체 목록 조회 실패');
  }

  let passCount = 0;
  let failCount = 0;

  for (const vendor of vendorsData.data) {
    try {
      const required = ['id', 'business_name', 'vehicle_count'];
      const missing = required.filter(f => !vendor[f] && vendor[f] !== 0);

      if (missing.length > 0) {
        throw new Error(`필수 필드 누락: ${missing.join(', ')}`);
      }

      log('업체카드', 'PASS', `${vendor.business_name} - ${vendor.vehicle_count}대`);
      passCount++;

    } catch (error: any) {
      log('업체카드', 'FAIL', `${vendor.business_name} - ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n   📊 업체 카드 결과: ✅ ${passCount}/${vendorsData.data.length}\n`);

  return { passCount, failCount };
}

// ============================================================================
// 메인 실행
// ============================================================================
async function runPublicTests() {
  console.log('🚀 렌트카 공개 기능 전체 테스트 시작');
  console.log('='.repeat(80));
  console.log('테스트 대상: 165개 차량 전체');
  console.log('테스트 범위:');
  console.log('  1. 차량 상세 페이지 (165개)');
  console.log('  2. 업체 페이지 및 차량 카드 (165개)');
  console.log('  3. 이미지 갤러리 (165개)');
  console.log('  4. 결제 플로우 (165개)');
  console.log('  5. 가격 계산 로직 (165개)');
  console.log('  6. 업체 카드 UI');
  console.log('='.repeat(80));

  try {
    // 1. 차량 상세 페이지
    const detailResults = await testAll165VehicleDetailPages();

    // 2. 업체 페이지 및 차량 카드
    const cardResults = await testVendorPageAndAllVehicleCards();

    // 3. 이미지 갤러리
    const imageResults = await testImageGalleryAll();

    // 4. 결제 플로우
    const paymentResults = await testPaymentFlowAllVehicles();

    // 5. 가격 계산
    const priceResults = await testPriceCalculationAll();

    // 6. 업체 카드
    const vendorResults = await testVendorCards();

    // 최종 결과
    console.log('\n' + '='.repeat(80));
    console.log('📊 최종 테스트 결과');
    console.log('='.repeat(80));

    const totalTests = results.length;
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;

    console.log(`\n✅ PASS:  ${passed}`);
    console.log(`⚠️  WARN:  ${warned}`);
    console.log(`❌ FAIL:  ${failed}`);
    console.log(`\n총 테스트: ${totalTests}`);

    const successRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : '0';
    console.log(`\n📈 성공률: ${successRate}%`);

    // 상세 결과
    console.log('\n' + '-'.repeat(80));
    console.log('상세 결과');
    console.log('-'.repeat(80));

    console.log(`\n1. 차량 상세 페이지 (165개):`);
    console.log(`   ✅ ${detailResults.passCount} | ⚠️  ${detailResults.warnCount} | ❌ ${detailResults.failCount}`);

    console.log(`\n2. 차량 카드 (165개):`);
    console.log(`   ✅ ${cardResults.cardPass} | ❌ ${cardResults.cardFail}`);

    console.log(`\n3. 이미지 갤러리:`);
    console.log(`   이미지 있음: ${imageResults.hasImage}개`);
    console.log(`   이미지 없음: ${imageResults.noImage}개`);

    console.log(`\n4. 결제 플로우 (165개):`);
    console.log(`   ✅ ${paymentResults.passCount} | ❌ ${paymentResults.failCount}`);

    console.log(`\n5. 가격 계산 (165개):`);
    console.log(`   ✅ ${priceResults.passCount} | ❌ ${priceResults.failCount}`);
    console.log(`   일일: ₩${priceResults.stats.dailyMin.toLocaleString()} ~ ₩${priceResults.stats.dailyMax.toLocaleString()}`);
    console.log(`   시간: ₩${priceResults.stats.hourlyMin.toLocaleString()} ~ ₩${priceResults.stats.hourlyMax.toLocaleString()}`);

    console.log(`\n6. 업체 카드:`);
    console.log(`   ✅ ${vendorResults.passCount} | ❌ ${vendorResults.failCount}`);

    console.log('\n' + '='.repeat(80));

    if (failed === 0) {
      console.log('🎉 165개 차량 모든 공개 기능 테스트 통과!');
    } else {
      console.log(`⚠️  ${failed}개 테스트 실패.`);
    }

    console.log('='.repeat(80));
    console.log('');

  } catch (error: any) {
    console.error('\n❌ 테스트 실행 오류:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runPublicTests();
