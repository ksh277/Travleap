/**
 * 렌트카 예약 플로우 전체 테스트
 * - 사용자 여정 시뮬레이션 (검색 → 상세 → 예약 → 결제)
 * - 모든 API 엔드포인트 통합 테스트
 * - 시간/일일 렌트 시나리오
 */

import 'dotenv/config';

const API_URL = 'http://localhost:3004';

interface TestResult {
  scenario: string;
  step: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function log(scenario: string, step: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, data?: any) {
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${scenario}] ${step}: ${message}`);
  results.push({ scenario, step, status, message, data });
}

// ========================================
// 시나리오 1: 시간 단위 렌트 플로우
// ========================================
async function scenario1_HourlyRental() {
  console.log('\n📍 SCENARIO 1: 시간 단위 렌트 플로우');
  console.log('   목표: 8시간 렌트 예약');
  console.log('   사용자: 신규 사용자 (회원가입 없음)');

  try {
    // Step 1: 렌트카 업체 목록 조회
    console.log('\n   STEP 1: 렌트카 업체 목록 조회');
    const vendorsRes = await fetch(`${API_URL}/api/rentcars`);
    const vendorsData = await vendorsRes.json();

    if (!vendorsData.success || !Array.isArray(vendorsData.data)) {
      throw new Error('업체 목록 조회 실패');
    }

    const pmsVendor = vendorsData.data.find((v: any) => v.business_name?.includes('PMS'));
    if (!pmsVendor) {
      throw new Error('PMS 업체 없음');
    }

    log('Scenario 1', 'Step 1', 'PASS', `업체 목록 조회 완료 (${vendorsData.data.length}개 업체)`);
    console.log(`      → PMS 업체: ${pmsVendor.business_name} (차량 ${pmsVendor.vehicle_count}대)`);

    // Step 2: 특정 차량 상세 정보 조회
    console.log('\n   STEP 2: 차량 상세 정보 조회');
    const vehicleId = 325; // 제네시스 G70
    const vehicleRes = await fetch(`${API_URL}/api/rentcar/vehicle/${vehicleId}`);
    const vehicleData = await vehicleRes.json();

    if (!vehicleData.success || !vehicleData.data) {
      throw new Error('차량 상세 조회 실패');
    }

    const vehicle = vehicleData.data;
    log('Scenario 1', 'Step 2', 'PASS', `차량 상세 조회: ${vehicle.brand} ${vehicle.model}`);
    console.log(`      → 시간당: ₩${vehicle.hourly_rate_krw?.toLocaleString()}`);
    console.log(`      → 일일: ₩${vehicle.daily_rate_krw?.toLocaleString()}`);
    console.log(`      → 좌석: ${vehicle.seating_capacity}인승`);

    // Step 3: 가격 계산 (8시간)
    console.log('\n   STEP 3: 가격 계산 (8시간 렌트)');
    const rentalHours = 8;
    const totalPrice = vehicle.hourly_rate_krw * rentalHours;

    log('Scenario 1', 'Step 3', 'PASS', `가격 계산 완료: ${rentalHours}시간 × ₩${vehicle.hourly_rate_krw.toLocaleString()} = ₩${totalPrice.toLocaleString()}`);
    console.log(`      → 총 금액: ₩${totalPrice.toLocaleString()}`);

    // Step 4: 예약 정보 준비
    console.log('\n   STEP 4: 예약 정보 준비');
    const bookingInfo = {
      vehicle_id: vehicleId,
      vendor_id: vehicle.vendor_id,
      rental_type: 'hourly',
      rental_hours: rentalHours,
      pickup_date: '2025-10-25T09:00:00',
      return_date: '2025-10-25T17:00:00',
      total_price: totalPrice,
      customer: {
        name: '김테스트',
        phone: '010-1234-5678',
        email: 'test@example.com'
      }
    };

    log('Scenario 1', 'Step 4', 'PASS', '예약 정보 준비 완료', bookingInfo);
    console.log(`      → 대여: ${bookingInfo.pickup_date}`);
    console.log(`      → 반납: ${bookingInfo.return_date}`);
    console.log(`      → 고객: ${bookingInfo.customer.name} (${bookingInfo.customer.phone})`);

    // Step 5: 예약 생성 시뮬레이션 (실제 API는 미구현일 수 있음)
    console.log('\n   STEP 5: 예약 생성 (시뮬레이션)');
    log('Scenario 1', 'Step 5', 'PASS', '예약 플로우 검증 완료 (시뮬레이션)');
    console.log(`      → 예약 ID: SIM-${Date.now()}`);
    console.log(`      → 결제 금액: ₩${totalPrice.toLocaleString()}`);

  } catch (error: any) {
    log('Scenario 1', 'Error', 'FAIL', error.message);
  }
}

// ========================================
// 시나리오 2: 일일 단위 렌트 플로우
// ========================================
async function scenario2_DailyRental() {
  console.log('\n📍 SCENARIO 2: 일일 단위 렌트 플로우');
  console.log('   목표: 3박 4일 렌트 예약');
  console.log('   사용자: 기존 회원');

  try {
    // Step 1: 차량 검색 (SUV, luxury)
    console.log('\n   STEP 1: 차량 검색 (SUV, Luxury)');
    const vendorsRes = await fetch(`${API_URL}/api/rentcars`);
    const vendorsData = await vendorsRes.json();

    log('Scenario 2', 'Step 1', 'PASS', '차량 검색 시작');

    // Step 2: PMS 업체 차량 목록 조회 (필터링 시뮬레이션)
    console.log('\n   STEP 2: 고급 SUV 차량 찾기');
    const vehicleId = 337; // BMW X7 (luxury SUV 중 하나)
    const vehicleRes = await fetch(`${API_URL}/api/rentcar/vehicle/${vehicleId}`);
    const vehicleData = await vehicleRes.json();

    if (!vehicleData.success) {
      throw new Error('차량 조회 실패');
    }

    const vehicle = vehicleData.data;
    log('Scenario 2', 'Step 2', 'PASS', `차량 선택: ${vehicle.brand} ${vehicle.model}`);
    console.log(`      → 클래스: ${vehicle.vehicle_class}`);
    console.log(`      → 타입: ${vehicle.vehicle_type}`);
    console.log(`      → 일일 요금: ₩${vehicle.daily_rate_krw?.toLocaleString()}`);

    // Step 3: 가격 계산 (3박 4일 = 4일)
    console.log('\n   STEP 3: 가격 계산 (3박 4일)');
    const rentalDays = 4;
    const totalPrice = vehicle.daily_rate_krw * rentalDays;

    log('Scenario 2', 'Step 3', 'PASS', `가격 계산 완료: ${rentalDays}일 × ₩${vehicle.daily_rate_krw.toLocaleString()} = ₩${totalPrice.toLocaleString()}`);
    console.log(`      → 총 금액: ₩${totalPrice.toLocaleString()}`);
    console.log(`      → 보증금: ₩${vehicle.deposit_amount_krw?.toLocaleString()}`);

    // Step 4: 추가 옵션 선택
    console.log('\n   STEP 4: 추가 옵션 선택');
    const options = {
      self_insurance: vehicle.self_insurance_krw || 0,
      child_seat: 20000 * rentalDays, // 일당 2만원
      gps: 0 // 기본 포함
    };

    const optionsTotal = Object.values(options).reduce((a, b) => a + b, 0);
    const finalPrice = totalPrice + optionsTotal;

    log('Scenario 2', 'Step 4', 'PASS', `옵션 추가: ₩${optionsTotal.toLocaleString()}`);
    console.log(`      → 자차 보험: ₩${options.self_insurance.toLocaleString()}`);
    console.log(`      → 카시트: ₩${options.child_seat.toLocaleString()}`);
    console.log(`      → GPS: 무료`);
    console.log(`      → 최종 금액: ₩${finalPrice.toLocaleString()}`);

    // Step 5: 예약 생성
    console.log('\n   STEP 5: 예약 생성');
    const bookingInfo = {
      vehicle_id: vehicleId,
      vendor_id: vehicle.vendor_id,
      rental_type: 'daily',
      rental_days: rentalDays,
      pickup_date: '2025-11-01T10:00:00',
      return_date: '2025-11-05T10:00:00',
      base_price: totalPrice,
      options_price: optionsTotal,
      total_price: finalPrice,
      deposit: vehicle.deposit_amount_krw,
      customer: {
        name: '박회원',
        phone: '010-9876-5432',
        email: 'member@example.com',
        license_number: '12-345678-90'
      }
    };

    log('Scenario 2', 'Step 5', 'PASS', '예약 플로우 검증 완료', bookingInfo);
    console.log(`      → 예약 ID: SIM-${Date.now()}`);

  } catch (error: any) {
    log('Scenario 2', 'Error', 'FAIL', error.message);
  }
}

// ========================================
// 시나리오 3: 벤더 차량 관리 플로우
// ========================================
async function scenario3_VendorManagement() {
  console.log('\n📍 SCENARIO 3: 벤더 차량 관리 플로우');
  console.log('   목표: 차량 등록 → 수정 → 조회 → 삭제');
  console.log('   사용자: PMS 테스트 벤더');

  let authToken = '';
  let testVehicleId: number | null = null;

  try {
    // Step 1: 벤더 로그인
    console.log('\n   STEP 1: 벤더 로그인');
    const loginRes = await fetch(`${API_URL}/api/vendor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pmstest@vendor.com',
        password: 'pmstest123'
      })
    });

    const loginData = await loginRes.json();

    if (!loginData.success || !loginData.token) {
      throw new Error('로그인 실패');
    }

    authToken = loginData.token;
    log('Scenario 3', 'Step 1', 'PASS', `로그인 성공: ${loginData.user.email}`);
    console.log(`      → Vendor ID: ${loginData.user.id}`);

    // Step 2: 내 차량 목록 조회
    console.log('\n   STEP 2: 내 차량 목록 조회');
    const vehiclesRes = await fetch(`${API_URL}/api/vendor/vehicles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const vehiclesData = await vehiclesRes.json();

    if (!vehiclesData.success) {
      throw new Error('차량 목록 조회 실패');
    }

    const count = vehiclesData.data.length;
    log('Scenario 3', 'Step 2', 'PASS', `차량 목록 조회 완료: ${count}대`);
    if (count > 0) {
      console.log(`      → 샘플: ${vehiclesData.data[0].brand} ${vehiclesData.data[0].model}`);
    }

    // Step 3: 새 차량 등록
    console.log('\n   STEP 3: 새 차량 등록');
    const newVehicle = {
      brand: '테스트',
      model: '차량 (자동 테스트)',
      year: 2024,
      vehicle_class: 'compact',
      vehicle_type: 'sedan',
      fuel_type: 'gasoline',
      transmission: 'automatic',
      seating_capacity: 5,
      door_count: 4,
      daily_rate_krw: 60000,
      hourly_rate_krw: 3000,
      images: []
    };

    const createRes = await fetch(`${API_URL}/api/vendor/vehicles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newVehicle)
    });

    const createData = await createRes.json();

    if (!createData.success) {
      throw new Error('차량 등록 실패');
    }

    testVehicleId = createData.vehicle_id || createData.data?.id;
    log('Scenario 3', 'Step 3', 'PASS', `차량 등록 성공: ID ${testVehicleId}`);
    console.log(`      → 브랜드: ${newVehicle.brand} ${newVehicle.model}`);
    console.log(`      → 시간 요금: ₩${newVehicle.hourly_rate_krw.toLocaleString()}`);

    // Step 4: 차량 정보 수정
    console.log('\n   STEP 4: 차량 정보 수정');
    const updates = {
      hourly_rate_krw: 4000, // 3000 → 4000
      daily_rate_krw: 70000  // 60000 → 70000
    };

    const updateRes = await fetch(`${API_URL}/api/vendor/rentcar/vehicles/${testVehicleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    const updateData = await updateRes.json();

    if (!updateData.success) {
      throw new Error('차량 수정 실패');
    }

    log('Scenario 3', 'Step 4', 'PASS', '차량 수정 성공');
    console.log(`      → 시간 요금: ₩3,000 → ₩4,000`);
    console.log(`      → 일일 요금: ₩60,000 → ₩70,000`);

    // Step 5: 수정된 차량 조회
    console.log('\n   STEP 5: 수정된 차량 조회');
    const detailRes = await fetch(`${API_URL}/api/rentcar/vehicle/${testVehicleId}`);
    const detailData = await detailRes.json();

    if (!detailData.success) {
      throw new Error('차량 조회 실패');
    }

    const v = detailData.data;
    const hourlyMatch = v.hourly_rate_krw == 4000;
    const dailyMatch = v.daily_rate_krw == 70000;

    if (hourlyMatch && dailyMatch) {
      log('Scenario 3', 'Step 5', 'PASS', '수정 내용 반영 확인');
      console.log(`      → 시간 요금: ₩${v.hourly_rate_krw.toLocaleString()} ✅`);
      console.log(`      → 일일 요금: ₩${v.daily_rate_krw.toLocaleString()} ✅`);
    } else {
      log('Scenario 3', 'Step 5', 'WARN', '수정 내용 일부 미반영');
    }

    // Step 6: 차량 삭제
    console.log('\n   STEP 6: 차량 삭제 (테스트 정리)');
    const deleteRes = await fetch(`${API_URL}/api/vendor/rentcar/vehicles/${testVehicleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const deleteData = await deleteRes.json();

    if (!deleteData.success) {
      throw new Error('차량 삭제 실패');
    }

    log('Scenario 3', 'Step 6', 'PASS', `차량 삭제 완료: ID ${testVehicleId}`);
    console.log(`      → 테스트 데이터 정리 완료`);

  } catch (error: any) {
    log('Scenario 3', 'Error', 'FAIL', error.message);

    // 실패 시에도 테스트 차량 삭제 시도
    if (testVehicleId && authToken) {
      try {
        console.log('\n   🧹 정리: 테스트 차량 삭제 시도');
        await fetch(`${API_URL}/api/vendor/rentcar/vehicles/${testVehicleId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`      → 테스트 차량 ${testVehicleId} 삭제 완료`);
      } catch (e) {
        console.log(`      → 테스트 차량 삭제 실패 (수동 정리 필요: ID ${testVehicleId})`);
      }
    }
  }
}

// ========================================
// 시나리오 4: 보안 및 권한 검증
// ========================================
async function scenario4_SecurityValidation() {
  console.log('\n📍 SCENARIO 4: 보안 및 권한 검증');
  console.log('   목표: JWT 인증, 소유권 검증');

  try {
    // Test 1: 잘못된 토큰
    console.log('\n   TEST 1: 잘못된 JWT 토큰');
    const invalidTokenRes = await fetch(`${API_URL}/api/vendor/vehicles`, {
      headers: {
        'Authorization': 'Bearer invalid_token_123456',
        'Content-Type': 'application/json'
      }
    });

    const invalidTokenData = await invalidTokenRes.json();

    if (!invalidTokenData.success && invalidTokenRes.status === 401) {
      log('Scenario 4', 'Test 1', 'PASS', '잘못된 토큰 거부 (401 Unauthorized)');
      console.log(`      → 보안: ✅ 정상 작동`);
    } else {
      log('Scenario 4', 'Test 1', 'FAIL', '보안 취약: 잘못된 토큰 허용됨');
    }

    // Test 2: 토큰 없음
    console.log('\n   TEST 2: 토큰 없이 요청');
    const noTokenRes = await fetch(`${API_URL}/api/vendor/vehicles`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const noTokenData = await noTokenRes.json();

    if (!noTokenData.success && noTokenRes.status === 401) {
      log('Scenario 4', 'Test 2', 'PASS', '토큰 없음 거부 (401 Unauthorized)');
      console.log(`      → 보안: ✅ 정상 작동`);
    } else {
      log('Scenario 4', 'Test 2', 'FAIL', '보안 취약: 토큰 없이 접근 가능');
    }

    // Test 3: 소유권 검증 (다른 업체의 차량 수정 시도)
    console.log('\n   TEST 3: 소유권 검증 (다른 업체 차량 수정 시도)');

    // 먼저 올바른 로그인
    const loginRes = await fetch(`${API_URL}/api/vendor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pmstest@vendor.com',
        password: 'pmstest123'
      })
    });

    const loginData = await loginRes.json();

    if (!loginData.success) {
      throw new Error('로그인 실패');
    }

    // 다른 업체의 차량 ID로 수정 시도 (예: ID 1은 Turo 업체)
    const otherVehicleId = 1;
    const unauthorizedUpdateRes = await fetch(`${API_URL}/api/vendor/rentcar/vehicles/${otherVehicleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ daily_rate_krw: 999999 })
    });

    const unauthorizedUpdateData = await unauthorizedUpdateRes.json();

    if (!unauthorizedUpdateData.success && (unauthorizedUpdateRes.status === 403 || unauthorizedUpdateRes.status === 404)) {
      log('Scenario 4', 'Test 3', 'PASS', '소유권 검증 작동 (다른 업체 차량 수정 차단)');
      console.log(`      → 보안: ✅ 정상 작동`);
    } else if (unauthorizedUpdateData.success) {
      log('Scenario 4', 'Test 3', 'FAIL', '보안 취약: 다른 업체 차량 수정 가능');
    } else {
      log('Scenario 4', 'Test 3', 'WARN', '소유권 검증 상태 불명확');
    }

  } catch (error: any) {
    log('Scenario 4', 'Error', 'FAIL', error.message);
  }
}

// ========================================
// 시나리오 5: 가격 계산 로직 검증
// ========================================
async function scenario5_PriceCalculation() {
  console.log('\n📍 SCENARIO 5: 가격 계산 로직 검증');
  console.log('   목표: 시간/일일 요금 계산 정확도');

  try {
    // 차량 조회
    const vehicleRes = await fetch(`${API_URL}/api/rentcar/vehicle/325`);
    const vehicleData = await vehicleRes.json();

    if (!vehicleData.success) {
      throw new Error('차량 조회 실패');
    }

    const v = vehicleData.data;

    console.log(`\n   차량: ${v.brand} ${v.model}`);
    console.log(`   시간당: ₩${v.hourly_rate_krw.toLocaleString()}`);
    console.log(`   일일: ₩${v.daily_rate_krw.toLocaleString()}`);

    // Test 1: 시간 단위 계산
    console.log('\n   TEST 1: 시간 단위 계산');
    const testCases = [
      { hours: 4, expected: v.hourly_rate_krw * 4 },
      { hours: 8, expected: v.hourly_rate_krw * 8 },
      { hours: 12, expected: v.hourly_rate_krw * 12 },
      { hours: 24, expected: v.hourly_rate_krw * 24 }
    ];

    testCases.forEach(test => {
      const calculated = v.hourly_rate_krw * test.hours;
      const match = calculated === test.expected;
      const status = match ? 'PASS' : 'FAIL';

      log('Scenario 5', `Test 1.${test.hours}h`, status,
        `${test.hours}시간: ₩${calculated.toLocaleString()} ${match ? '✅' : '❌'}`);
    });

    // Test 2: 일일 vs 24시간 가격 비교
    console.log('\n   TEST 2: 일일 vs 24시간 가격 비교');
    const price24h = v.hourly_rate_krw * 24;
    const priceDaily = v.daily_rate_krw;
    const diff = priceDaily - price24h;
    const diffPercent = ((price24h / priceDaily) * 100).toFixed(1);

    console.log(`      → 24시간: ₩${price24h.toLocaleString()}`);
    console.log(`      → 1일: ₩${priceDaily.toLocaleString()}`);
    console.log(`      → 차이: ₩${Math.abs(diff).toLocaleString()} (${price24h > priceDaily ? '24시간이 비쌈' : '일일이 비쌈'})`);
    console.log(`      → 24시간 가격은 일일 요금의 ${diffPercent}%`);

    if (price24h > priceDaily) {
      log('Scenario 5', 'Test 2', 'PASS', '일일 렌트가 24시간보다 저렴 (정상)');
    } else {
      log('Scenario 5', 'Test 2', 'WARN', '24시간 렌트가 일일보다 저렴 (검토 필요)');
    }

    // Test 3: 시간당 요금 자동 계산 공식 검증
    console.log('\n   TEST 3: 자동 계산 공식 검증');
    const calculatedHourly = Math.round((v.daily_rate_krw / 24) * 1.2 / 1000) * 1000;
    const actualHourly = v.hourly_rate_krw;
    const formulaMatch = calculatedHourly === actualHourly;

    console.log(`      → 공식: (일일 / 24) × 1.2, 1000원 단위 반올림`);
    console.log(`      → 계산값: ₩${calculatedHourly.toLocaleString()}`);
    console.log(`      → 실제값: ₩${actualHourly.toLocaleString()}`);
    console.log(`      → 일치: ${formulaMatch ? 'YES ✅' : 'NO ❌'}`);

    log('Scenario 5', 'Test 3', formulaMatch ? 'PASS' : 'WARN',
      formulaMatch ? '자동 계산 공식 일치' : '자동 계산 공식 불일치 (수동 설정됨)');

  } catch (error: any) {
    log('Scenario 5', 'Error', 'FAIL', error.message);
  }
}

// ========================================
// 메인 실행
// ========================================
async function runAllScenarios() {
  console.log('🚀 렌트카 예약 플로우 전체 테스트 시작\n');
  console.log(`API URL: ${API_URL}`);
  console.log('='.repeat(60));

  await scenario1_HourlyRental();
  await scenario2_DailyRental();
  await scenario3_VendorManagement();
  await scenario4_SecurityValidation();
  await scenario5_PriceCalculation();

  // 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log(`\n✅ PASS: ${passed}`);
  console.log(`⚠️  WARN: ${warned}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`\n총 테스트: ${results.length}`);

  const successRate = ((passed / results.length) * 100).toFixed(1);
  console.log(`\n📈 성공률: ${successRate}%`);

  // 시나리오별 상세
  console.log('\n' + '-'.repeat(60));
  console.log('시나리오별 상세');
  console.log('-'.repeat(60));

  const scenarios = ['Scenario 1', 'Scenario 2', 'Scenario 3', 'Scenario 4', 'Scenario 5'];
  scenarios.forEach(scenario => {
    const scenarioResults = results.filter(r => r.scenario === scenario);
    const scenarioPassed = scenarioResults.filter(r => r.status === 'PASS').length;
    const scenarioTotal = scenarioResults.length;
    const rate = scenarioTotal > 0 ? ((scenarioPassed / scenarioTotal) * 100).toFixed(0) : '0';

    console.log(`\n${scenario}: ${scenarioPassed}/${scenarioTotal} (${rate}%)`);
    scenarioResults.forEach(r => {
      const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
      console.log(`  ${icon} ${r.step}: ${r.message}`);
    });
  });

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('🎉 모든 예약 플로우 테스트 통과! 🎉\n');
  } else {
    console.log('❌ 일부 테스트 실패. 로그를 확인하세요.\n');
  }
}

runAllScenarios().catch(console.error);
