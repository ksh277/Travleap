/**
 * 렌트카 전체 플로우 테스트
 * 1. 업체 2개 생성 (CSV용, API용)
 * 2. CSV 방식으로 차량 3대 추가
 * 3. API 동기화로 차량 3대 추가
 */

async function testRentcarFullFlow() {
  try {
    console.log('🚗 ===== 렌트카 전체 플로우 테스트 시작 =====\n');

    const BASE_URL = 'http://localhost:3004';

    // Step 1: 업체 2개 생성
    console.log('📋 Step 1: 렌트카 업체 2개 생성\n');

    // 업체 1: CSV 업로드용
    console.log('1-1. CSV 업로드용 업체 생성...');
    const csvVendor = {
      vendor_code: 'CSV_VENDOR_001',
      business_name: '신안 퍼플렌터카',
      brand_name: '퍼플렌터카',
      business_number: '123-45-67890',
      contact_name: '김렌트',
      contact_email: 'purple@rentcar.com',
      contact_phone: '061-111-2222',
      description: '신안군 전 지역 렌터카 서비스. CSV 업로드 방식으로 차량 관리.',
      api_enabled: false
    };

    const csvVendorRes = await fetch(`${BASE_URL}/api/admin/rentcar/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(csvVendor)
    });
    const csvVendorData = await csvVendorRes.json();

    if (!csvVendorData.success) {
      throw new Error(`CSV 업체 생성 실패: ${csvVendorData.message || csvVendorData.error}`);
    }

    const csvVendorId = csvVendorData.data.id;
    console.log(`   ✅ CSV 업체 생성 완료 (ID: ${csvVendorId})\n`);

    // 업체 2: API 연동용
    console.log('1-2. API 연동용 업체 생성...');
    const apiVendor = {
      vendor_code: 'API_VENDOR_001',
      business_name: '증도 그린렌터카',
      brand_name: '그린렌터카',
      business_number: '098-76-54321',
      contact_name: '박자동',
      contact_email: 'green@rentcar.com',
      contact_phone: '061-333-4444',
      description: '증도면 전문 렌터카. API 자동 동기화로 실시간 차량 관리.',
      api_enabled: true,
      api_url: 'http://localhost:3005/api/vehicles',
      api_key: 'test_api_key_12345',
      api_auth_type: 'bearer'
    };

    const apiVendorRes = await fetch(`${BASE_URL}/api/admin/rentcar/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiVendor)
    });
    const apiVendorData = await apiVendorRes.json();

    if (!apiVendorData.success) {
      throw new Error(`API 업체 생성 실패: ${apiVendorData.message || apiVendorData.error}`);
    }

    const apiVendorId = apiVendorData.data.id;
    console.log(`   ✅ API 업체 생성 완료 (ID: ${apiVendorId})\n`);

    // Step 2: CSV 방식으로 차량 3대 추가
    console.log('📋 Step 2: CSV 방식으로 차량 3대 추가 (업체 1)\n');

    const csvVehicles = [
      {
        vehicle_code: 'CSV001',
        brand: '현대',
        model: '쏘나타',
        year: 2024,
        display_name: '현대 쏘나타 2024',
        vehicle_class: 'midsize',
        vehicle_type: '세단',
        fuel_type: 'gasoline',
        transmission: 'automatic',
        seating_capacity: 5,
        door_count: 4,
        large_bags: 3,
        small_bags: 2,
        daily_rate_krw: 60000,
        deposit_amount_krw: 120000,
        thumbnail_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400',
        images: ['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'],
        features: ['스마트 크루즈 컨트롤', '후방 카메라', '열선 시트'],
        age_requirement: 21,
        license_requirement: '1년 이상',
        mileage_limit_per_day: 200,
        unlimited_mileage: false,
        smoking_allowed: false
      },
      {
        vehicle_code: 'CSV002',
        brand: '기아',
        model: '스포티지',
        year: 2024,
        display_name: '기아 스포티지 2024',
        vehicle_class: 'suv',
        vehicle_type: 'SUV',
        fuel_type: 'diesel',
        transmission: 'automatic',
        seating_capacity: 5,
        door_count: 4,
        large_bags: 4,
        small_bags: 2,
        daily_rate_krw: 75000,
        deposit_amount_krw: 150000,
        thumbnail_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400',
        images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800'],
        features: ['파노라마 선루프', '전동 트렁크', 'LED 헤드라이트'],
        age_requirement: 21,
        license_requirement: '1년 이상',
        mileage_limit_per_day: 200,
        unlimited_mileage: false,
        smoking_allowed: false
      },
      {
        vehicle_code: 'CSV003',
        brand: '현대',
        model: '캐스퍼',
        year: 2024,
        display_name: '현대 캐스퍼 2024',
        vehicle_class: 'compact',
        vehicle_type: '경차',
        fuel_type: 'gasoline',
        transmission: 'automatic',
        seating_capacity: 4,
        door_count: 4,
        large_bags: 1,
        small_bags: 2,
        daily_rate_krw: 35000,
        deposit_amount_krw: 80000,
        thumbnail_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
        images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800'],
        features: ['연비 우수', '주차 편리', '블루투스'],
        age_requirement: 21,
        license_requirement: '1년 이상',
        mileage_limit_per_day: 150,
        unlimited_mileage: false,
        smoking_allowed: false
      }
    ];

    for (let i = 0; i < csvVehicles.length; i++) {
      console.log(`   ${i + 1}. ${csvVehicles[i].display_name} 추가 중...`);

      const vehicleRes = await fetch(`${BASE_URL}/api/admin/rentcar/vendors/${csvVendorId}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(csvVehicles[i])
      });

      const vehicleData = await vehicleRes.json();

      if (vehicleData.success) {
        console.log(`      ✅ 차량 추가 완료 (ID: ${vehicleData.data.id})`);
      } else {
        console.log(`      ❌ 실패: ${vehicleData.message || vehicleData.error}`);
      }
    }

    console.log();

    // Step 3: API 동기화로 차량 3대 추가
    console.log('📋 Step 3: API 동기화로 차량 3대 추가 (업체 2)\n');
    console.log(`   Mock API URL: http://localhost:3005/api/vehicles`);
    console.log(`   동기화 시작...\n`);

    const syncRes = await fetch(`${BASE_URL}/api/admin/rentcar/sync/${apiVendorId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const syncData = await syncRes.json();

    if (syncData.success) {
      console.log(`   ✅ API 동기화 완료!`);
      console.log(`      총 ${syncData.data.total}대 처리`);
      console.log(`      성공: ${syncData.data.success}대`);
      console.log(`      실패: ${syncData.data.failed}대\n`);
    } else {
      console.log(`   ❌ API 동기화 실패: ${syncData.message}\n`);
    }

    // Step 4: 결과 확인
    console.log('📋 Step 4: 결과 확인\n');

    const vendorsRes = await fetch(`${BASE_URL}/api/vendors`);
    const vendorsData = await vendorsRes.json();

    console.log('✅ 등록된 렌트카 업체:');
    if (vendorsData.success && vendorsData.data) {
      vendorsData.data.forEach((v: any, idx: number) => {
        console.log(`   ${idx + 1}. ${v.business_name} (차량 ${v.total_vehicles || 0}대)`);
      });
    }

    console.log('\n🎉 ===== 테스트 완료 =====');
    console.log('\n다음 확인 사항:');
    console.log('  1. http://localhost:5174/rentcar 접속');
    console.log('  2. 업체 카드 6개 표시되는지 확인 (기존 + 신규 2개)');
    console.log('  3. 각 업체 클릭 시 차량 목록 표시되는지 확인');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error instanceof Error ? error.message : String(error));
  } finally {
    process.exit(0);
  }
}

testRentcarFullFlow();
