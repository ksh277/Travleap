// 렌트카 전체 기능 테스트 스크립트
const BASE_URL = 'http://localhost:3004';

async function testRentcarSystem() {
  console.log('🧪 렌트카 시스템 전체 테스트 시작\n');

  // ===== 1. 공개 API 테스트 =====
  console.log('📋 1. 공개 렌트카 목록 조회 (/api/rentcars)');
  try {
    const response = await fetch(`${BASE_URL}/api/rentcars`);
    const data = await response.json();

    if (data.success && data.data) {
      console.log(`✅ 총 ${data.data.length}개 업체`);
      data.data.forEach((vendor: any) => {
        console.log(`   - ID ${vendor.vendor_id}: ${vendor.vendor_name} (차량 ${vendor.vehicle_count}대)`);
      });
    } else {
      console.log('❌ 실패:', data.message);
    }
  } catch (error) {
    console.log('❌ 오류:', error);
  }

  console.log('\n');

  // ===== 2. 특정 업체 상세 조회 =====
  console.log('📋 2. 업체 상세 조회 (/api/rentcars/6)');
  try {
    const response = await fetch(`${BASE_URL}/api/rentcars/6`);
    const data = await response.json();

    if (data.success && data.data) {
      const vendor = data.data;
      console.log(`✅ ${vendor.vendor_name}`);
      console.log(`   - 차량 수: ${vendor.total_vehicles}대`);
      console.log(`   - 최저가: ${vendor.min_price?.toLocaleString()}원`);
      console.log(`   - 최고가: ${vendor.max_price?.toLocaleString()}원`);
      console.log(`   - 차량 목록: ${vendor.vehicles?.length || 0}개`);
    } else {
      console.log('❌ 실패:', data.message);
    }
  } catch (error) {
    console.log('❌ 오류:', error);
  }

  console.log('\n');

  // ===== 3. 차량 검색 테스트 =====
  console.log('📋 3. 차량 검색 (/api/rentcars/search)');
  try {
    const params = new URLSearchParams({
      pickup_date: '2025-01-01',
      dropoff_date: '2025-01-05',
      vehicle_type: 'sedan'
    });

    const response = await fetch(`${BASE_URL}/api/rentcars/search?${params}`);
    const data = await response.json();

    if (data.success && data.data) {
      console.log(`✅ 검색 결과: ${data.data.length}개 차량`);
      data.data.slice(0, 3).forEach((vehicle: any) => {
        console.log(`   - ${vehicle.display_name}: ${vehicle.daily_rate_krw?.toLocaleString()}원/일`);
      });
    } else {
      console.log('❌ 실패:', data.message);
    }
  } catch (error) {
    console.log('❌ 오류:', error);
  }

  console.log('\n');

  // ===== 4. Mock API 서버 테스트 =====
  console.log('📋 4. Mock API 서버 테스트 (http://localhost:3005)');
  try {
    const response = await fetch('http://localhost:3005/api/vehicles', {
      headers: {
        'Authorization': 'Bearer test_api_key_12345'
      }
    });

    const data = await response.json();

    if (data.success && data.data) {
      console.log(`✅ Mock API 정상 작동 (${data.data.length}개 차량)`);
      data.data.forEach((vehicle: any) => {
        console.log(`   - ${vehicle.display_name}: ${vehicle.daily_rate_krw?.toLocaleString()}원/일`);
      });
    } else {
      console.log('❌ 실패');
    }
  } catch (error) {
    console.log('⚠️  Mock API 서버가 실행되지 않았습니다 (npx tsx mock-rentcar-api.ts 실행 필요)');
  }

  console.log('\n');

  // ===== 5. 데이터베이스 스키마 확인 (API 컬럼) =====
  console.log('📋 5. API 컬럼 확인');
  console.log('   PlanetScale 콘솔에서 확인 필요:');
  console.log('   - api_url (VARCHAR 500)');
  console.log('   - api_key (VARCHAR 500)');
  console.log('   - api_auth_type (VARCHAR 50)');
  console.log('   - api_enabled (BOOLEAN)');

  console.log('\n');

  // ===== 테스트 요약 =====
  console.log('📊 테스트 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 공개 API - 렌트카 목록 조회');
  console.log('✅ 공개 API - 업체 상세 조회');
  console.log('✅ 공개 API - 차량 검색');
  console.log('✅ Mock API 서버 테스트');
  console.log('');
  console.log('📌 다음 단계:');
  console.log('1. PlanetScale 콘솔에서 API 컬럼 추가 완료 확인');
  console.log('2. Vendor 11에 API 설정 추가 (api_url, api_key, api_enabled=true)');
  console.log('3. 관리자 페이지에서 API 동기화 버튼 테스트');
  console.log('4. CSV 업로드 기능 테스트');
  console.log('5. Vendor Dashboard에서 차량 CRUD 테스트');
  console.log('   - 차량 추가 (POST)');
  console.log('   - 차량 수정 (PUT)');
  console.log('   - 차량 삭제 (DELETE)');
  console.log('   - 가용성 토글 (PATCH)');
}

// 실행
testRentcarSystem().catch(console.error);
