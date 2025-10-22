/**
 * 165개 차량 전체 테스트
 * - 각 차량의 데이터 유효성 검증
 * - API 조회 테스트
 * - 가격 계산 테스트
 * - 이미지 및 필수 필드 검증
 * - 예약 가능 여부 확인
 */

import 'dotenv/config';
import { connect } from '@planetscale/database';

const planetscale = connect({ url: process.env.DATABASE_URL! });
const API_URL = 'http://localhost:3004';

interface VehicleTest {
  id: number;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  issues: string[];
  details: any;
}

const results: VehicleTest[] = [];
let passCount = 0;
let failCount = 0;
let warnCount = 0;

// 테스트 결과 로깅
function logTest(vehicleId: number, name: string, status: 'PASS' | 'FAIL' | 'WARN', issues: string[], details: any = {}) {
  results.push({ id: vehicleId, name, status, issues, details });

  if (status === 'PASS') {
    passCount++;
    console.log(`✅ [${vehicleId}] ${name}`);
  } else if (status === 'WARN') {
    warnCount++;
    console.log(`⚠️  [${vehicleId}] ${name} - ${issues.join(', ')}`);
  } else {
    failCount++;
    console.log(`❌ [${vehicleId}] ${name} - ${issues.join(', ')}`);
  }
}

// 1단계: 데이터베이스에서 모든 차량 조회
async function getAllVehicles() {
  console.log('🔍 1단계: PlanetScale에서 165개 차량 조회 중...\n');

  const result = await planetscale.execute(
    `SELECT
      id,
      brand,
      model,
      vehicle_class,
      vehicle_type,
      fuel_type,
      transmission,
      seating_capacity,
      daily_rate_krw,
      hourly_rate_krw,
      images,
      is_active,
      deposit_amount_krw
    FROM rentcar_vehicles
    WHERE vendor_id = 13
    ORDER BY id ASC`
  );

  if (!result.rows || result.rows.length === 0) {
    throw new Error('차량을 찾을 수 없습니다');
  }

  console.log(`✅ ${result.rows.length}개 차량 로드 완료\n`);
  return result.rows;
}

// 2단계: 각 차량 데이터 유효성 검증
async function validateVehicleData(vehicle: any) {
  const issues: string[] = [];
  const vehicleName = `${vehicle.brand} ${vehicle.model}`;

  // 필수 필드 검증
  if (!vehicle.brand || vehicle.brand.trim() === '') {
    issues.push('브랜드 누락');
  }
  if (!vehicle.model || vehicle.model.trim() === '') {
    issues.push('모델 누락');
  }
  if (!vehicle.vehicle_class) {
    issues.push('차량 클래스 누락');
  }
  if (!vehicle.vehicle_type) {
    issues.push('차량 타입 누락');
  }
  if (!vehicle.fuel_type) {
    issues.push('연료 타입 누락');
  }
  if (!vehicle.transmission) {
    issues.push('변속기 타입 누락');
  }

  // 좌석 수 검증
  if (!vehicle.seating_capacity || vehicle.seating_capacity < 1) {
    issues.push('좌석 수 없음');
  } else if (vehicle.seating_capacity > 20) {
    issues.push(`좌석 수 비정상 (${vehicle.seating_capacity}석)`);
  }

  // 가격 검증
  if (!vehicle.daily_rate_krw || vehicle.daily_rate_krw < 10000) {
    issues.push(`일일 요금 비정상 (₩${vehicle.daily_rate_krw})`);
  }
  if (!vehicle.hourly_rate_krw || vehicle.hourly_rate_krw < 1000) {
    issues.push(`시간 요금 비정상 (₩${vehicle.hourly_rate_krw})`);
  }

  // 보증금 검증
  if (!vehicle.deposit_amount_krw || vehicle.deposit_amount_krw < 100000) {
    issues.push(`보증금 없음 또는 낮음 (₩${vehicle.deposit_amount_krw})`);
  }

  // 활성화 상태
  if (vehicle.is_active === 0 || vehicle.is_active === false) {
    issues.push('비활성화됨');
  }

  // ENUM 값 검증
  const validClasses = ['compact', 'midsize', 'fullsize', 'luxury', 'suv', 'van'];
  if (!validClasses.includes(vehicle.vehicle_class)) {
    issues.push(`잘못된 클래스: ${vehicle.vehicle_class}`);
  }

  const validTypes = ['sedan', 'suv', 'van', 'truck', 'motorcycle', 'sports'];
  if (!validTypes.includes(vehicle.vehicle_type)) {
    issues.push(`잘못된 타입: ${vehicle.vehicle_type}`);
  }

  const validFuels = ['gasoline', 'diesel', 'electric', 'hybrid'];
  if (!validFuels.includes(vehicle.fuel_type)) {
    issues.push(`잘못된 연료: ${vehicle.fuel_type}`);
  }

  const validTransmissions = ['manual', 'automatic'];
  if (!validTransmissions.includes(vehicle.transmission)) {
    issues.push(`잘못된 변속기: ${vehicle.transmission}`);
  }

  // 이미지 검증 (경고만)
  let imageIssue = false;
  if (!vehicle.images || vehicle.images === '[]' || vehicle.images === 'null') {
    imageIssue = true;
  }

  const status = issues.length > 0 ? 'FAIL' : (imageIssue ? 'WARN' : 'PASS');
  if (imageIssue && issues.length === 0) {
    issues.push('이미지 없음 (시스템 준비완료)');
  }

  return { status, issues, vehicleName };
}

// 3단계: API 조회 테스트
async function testVehicleAPI(vehicleId: number) {
  try {
    const response = await fetch(`${API_URL}/api/rentcar/vehicle/${vehicleId}`);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return { success: false, error: 'API 응답 실패' };
    }

    return { success: true, data: data.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4단계: 가격 계산 테스트
function testPriceCalculation(vehicle: any) {
  const issues: string[] = [];

  // 시간당 요금 × 24 vs 일일 요금 비교
  const hourly24 = vehicle.hourly_rate_krw * 24;
  const daily = vehicle.daily_rate_krw;

  if (hourly24 < daily) {
    issues.push(`가격 역전 (24시간: ₩${hourly24.toLocaleString()} < 일일: ₩${daily.toLocaleString()})`);
  }

  // 자동 계산 공식 검증
  const calculatedHourly = Math.round((daily / 24) * 1.2 / 1000) * 1000;
  const actualHourly = vehicle.hourly_rate_krw;

  // 10% 이상 차이나면 경고
  const diff = Math.abs(calculatedHourly - actualHourly);
  const diffPercent = (diff / calculatedHourly) * 100;

  if (diffPercent > 10) {
    issues.push(`시간 요금 계산식 불일치 (예상: ₩${calculatedHourly.toLocaleString()}, 실제: ₩${actualHourly.toLocaleString()})`);
  }

  return issues;
}

// 메인 테스트 실행
async function runFullTest() {
  console.log('🚀 165개 차량 전체 테스트 시작');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. 모든 차량 조회
    const vehicles = await getAllVehicles();

    // 2. 각 차량 테스트
    console.log('🔬 2단계: 각 차량 데이터 유효성 검증 중...\n');

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      const vehicleNum = i + 1;

      if (vehicleNum % 20 === 0) {
        console.log(`\n--- 진행률: ${vehicleNum}/${vehicles.length} (${((vehicleNum/vehicles.length)*100).toFixed(1)}%) ---\n`);
      }

      // 데이터 검증
      const validation = await validateVehicleData(vehicle);

      // 가격 계산 검증
      const priceIssues = testPriceCalculation(vehicle);
      const allIssues = [...validation.issues, ...priceIssues];

      // 최종 상태 결정
      let finalStatus: 'PASS' | 'FAIL' | 'WARN' = validation.status;
      if (priceIssues.length > 0) {
        finalStatus = 'FAIL';
      }

      logTest(vehicle.id, validation.vehicleName, finalStatus, allIssues, {
        class: vehicle.vehicle_class,
        daily: vehicle.daily_rate_krw,
        hourly: vehicle.hourly_rate_krw,
        seats: vehicle.seating_capacity
      });
    }

    // 3. API 테스트 (샘플 10개)
    console.log('\n\n🌐 3단계: API 조회 테스트 (샘플 10개)...\n');

    const sampleIndices = [0, 16, 33, 49, 66, 82, 99, 115, 132, 149];
    let apiPassCount = 0;
    let apiFailCount = 0;

    for (const idx of sampleIndices) {
      if (idx >= vehicles.length) continue;

      const vehicle = vehicles[idx];
      const apiResult = await testVehicleAPI(vehicle.id);

      if (apiResult.success) {
        console.log(`✅ API [${vehicle.id}] ${vehicle.brand} ${vehicle.model}`);
        apiPassCount++;
      } else {
        console.log(`❌ API [${vehicle.id}] ${vehicle.brand} ${vehicle.model} - ${apiResult.error}`);
        apiFailCount++;
      }
    }

    // 최종 결과 출력
    console.log('\n' + '='.repeat(80));
    console.log('📊 최종 테스트 결과');
    console.log('='.repeat(80));

    console.log(`\n📋 데이터 검증:`);
    console.log(`   ✅ PASS:  ${passCount}개`);
    console.log(`   ⚠️  WARN:  ${warnCount}개`);
    console.log(`   ❌ FAIL:  ${failCount}개`);
    console.log(`   📊 총 차량: ${vehicles.length}개`);

    const dataSuccessRate = ((passCount / vehicles.length) * 100).toFixed(1);
    console.log(`\n   성공률: ${dataSuccessRate}%`);

    console.log(`\n🌐 API 테스트 (샘플):`);
    console.log(`   ✅ 성공: ${apiPassCount}/10`);
    console.log(`   ❌ 실패: ${apiFailCount}/10`);

    // 문제가 있는 차량 목록
    if (failCount > 0) {
      console.log('\n\n❌ 실패한 차량 목록:');
      console.log('-'.repeat(80));

      const failedVehicles = results.filter(r => r.status === 'FAIL');
      failedVehicles.forEach((v, idx) => {
        console.log(`\n${idx + 1}. [ID ${v.id}] ${v.name}`);
        v.issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
      });
    }

    // 경고가 있는 차량 요약
    if (warnCount > 0) {
      console.log('\n\n⚠️  경고가 있는 차량 요약:');
      console.log('-'.repeat(80));

      const warnedVehicles = results.filter(r => r.status === 'WARN');
      console.log(`총 ${warnedVehicles.length}개 차량에 이미지가 없습니다.`);
      console.log(`(이미지 업로드 시스템은 준비 완료, 실제 이미지만 업로드하면 됨)`);
    }

    // 클래스별 통계
    console.log('\n\n📊 차량 클래스별 통계:');
    console.log('-'.repeat(80));

    const classCounts: { [key: string]: { total: number, pass: number, fail: number, warn: number } } = {};

    results.forEach(r => {
      const vehicleClass = r.details.class || 'unknown';
      if (!classCounts[vehicleClass]) {
        classCounts[vehicleClass] = { total: 0, pass: 0, fail: 0, warn: 0 };
      }
      classCounts[vehicleClass].total++;
      if (r.status === 'PASS') classCounts[vehicleClass].pass++;
      if (r.status === 'FAIL') classCounts[vehicleClass].fail++;
      if (r.status === 'WARN') classCounts[vehicleClass].warn++;
    });

    Object.entries(classCounts).forEach(([className, stats]) => {
      const rate = ((stats.pass / stats.total) * 100).toFixed(1);
      console.log(`\n${className.toUpperCase()}:`);
      console.log(`   총 ${stats.total}대 | ✅ ${stats.pass} | ⚠️  ${stats.warn} | ❌ ${stats.fail} | 성공률 ${rate}%`);
    });

    // 가격대별 통계
    console.log('\n\n💰 가격대별 통계:');
    console.log('-'.repeat(80));

    const priceRanges = {
      '저가 (< ₩100,000)': vehicles.filter(v => v.daily_rate_krw < 100000).length,
      '중가 (₩100,000 ~ ₩150,000)': vehicles.filter(v => v.daily_rate_krw >= 100000 && v.daily_rate_krw < 150000).length,
      '고가 (₩150,000 ~ ₩200,000)': vehicles.filter(v => v.daily_rate_krw >= 150000 && v.daily_rate_krw < 200000).length,
      '초고가 (≥ ₩200,000)': vehicles.filter(v => v.daily_rate_krw >= 200000).length
    };

    Object.entries(priceRanges).forEach(([range, count]) => {
      const percent = ((count / vehicles.length) * 100).toFixed(1);
      console.log(`   ${range}: ${count}대 (${percent}%)`);
    });

    console.log('\n' + '='.repeat(80));

    if (failCount === 0) {
      console.log('🎉 모든 차량 테스트 통과! (이미지 제외)');
    } else {
      console.log(`⚠️  ${failCount}개 차량에 문제가 있습니다. 위 목록을 확인하세요.`);
    }

    console.log('='.repeat(80));
    console.log('');

  } catch (error: any) {
    console.error('\n❌ 테스트 실행 오류:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runFullTest();
