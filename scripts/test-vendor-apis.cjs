require('dotenv').config();

async function testVendorAPIs() {
  const baseURL = 'http://localhost:3000';
  const vendorId = '1'; // 테스트용 vendor ID

  console.log('\n=== 렌트카 업체 API 테스트 ===\n');

  try {
    // 1. 업체 정보 조회
    console.log('1. GET /api/vendor/info');
    const infoResponse = await fetch(`${baseURL}/api/vendor/info?userId=${vendorId}`);
    const infoData = await infoResponse.json();
    console.log('Status:', infoResponse.status);
    console.log('Response:', JSON.stringify(infoData, null, 2));

    // 2. 차량 목록 조회
    console.log('\n2. GET /api/vendor/vehicles');
    const vehiclesResponse = await fetch(`${baseURL}/api/vendor/vehicles?userId=${vendorId}`);
    const vehiclesData = await vehiclesResponse.json();
    console.log('Status:', vehiclesResponse.status);
    console.log('차량 개수:', vehiclesData.data?.length || 0);
    if (vehiclesData.data && vehiclesData.data.length > 0) {
      console.log('첫 번째 차량:', JSON.stringify(vehiclesData.data[0], null, 2));
    }

    // 3. 예약 목록 조회
    console.log('\n3. GET /api/vendor/bookings');
    const bookingsResponse = await fetch(`${baseURL}/api/vendor/bookings?userId=${vendorId}`);
    const bookingsData = await bookingsResponse.json();
    console.log('Status:', bookingsResponse.status);
    console.log('예약 개수:', bookingsData.data?.length || 0);

    // 4. 매출 통계 조회
    console.log('\n4. GET /api/vendor/revenue');
    const revenueResponse = await fetch(`${baseURL}/api/vendor/revenue?userId=${vendorId}`);
    const revenueData = await revenueResponse.json();
    console.log('Status:', revenueResponse.status);
    console.log('Response:', JSON.stringify(revenueData, null, 2));

    // 5. 차량 추가 테스트
    console.log('\n5. POST /api/vendor/vehicles (차량 추가)');
    const newVehicle = {
      userId: vendorId,
      display_name: '테스트 차량 ' + Date.now(),
      vehicle_class: '중형',
      seating_capacity: 5,
      transmission_type: '자동',
      fuel_type: '가솔린',
      daily_rate_krw: 55000,
      weekly_rate_krw: 330000,
      monthly_rate_krw: 1100000,
      mileage_limit_km: 200,
      excess_mileage_fee_krw: 100,
      is_available: true,
      image_urls: [
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop'
      ],
      insurance_included: true,
      insurance_options: '자차보험, 대인배상',
      available_options: 'GPS, 블랙박스'
    };

    const addVehicleResponse = await fetch(`${baseURL}/api/vendor/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': vendorId
      },
      body: JSON.stringify(newVehicle)
    });
    const addVehicleData = await addVehicleResponse.json();
    console.log('Status:', addVehicleResponse.status);
    console.log('Response:', JSON.stringify(addVehicleData, null, 2));

    const newVehicleId = addVehicleData.data?.insertId;

    if (newVehicleId) {
      // 6. 차량 수정 테스트
      console.log('\n6. PUT /api/vendor/vehicles/' + newVehicleId);
      const updateData = {
        userId: vendorId,
        display_name: '수정된 테스트 차량',
        vehicle_class: '대형',
        seating_capacity: 7,
        transmission_type: '자동',
        fuel_type: '디젤',
        daily_rate_krw: 80000,
        weekly_rate_krw: 480000,
        monthly_rate_krw: 1600000,
        mileage_limit_km: 250,
        excess_mileage_fee_krw: 150,
        is_available: true,
        image_urls: [
          'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop'
        ]
      };

      const updateResponse = await fetch(`${baseURL}/api/vendor/vehicles/${newVehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': vendorId
        },
        body: JSON.stringify(updateData)
      });
      const updateResponseData = await updateResponse.json();
      console.log('Status:', updateResponse.status);
      console.log('Response:', JSON.stringify(updateResponseData, null, 2));

      // 7. 예약 가능 여부 토글 테스트
      console.log('\n7. PATCH /api/vendor/vehicles/' + newVehicleId + '/availability');
      const availabilityResponse = await fetch(`${baseURL}/api/vendor/vehicles/${newVehicleId}/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': vendorId
        },
        body: JSON.stringify({ userId: vendorId, is_available: false })
      });
      const availabilityData = await availabilityResponse.json();
      console.log('Status:', availabilityResponse.status);
      console.log('Response:', JSON.stringify(availabilityData, null, 2));

      // 8. 차량 삭제 테스트
      console.log('\n8. DELETE /api/vendor/vehicles/' + newVehicleId);
      const deleteResponse = await fetch(`${baseURL}/api/vendor/vehicles/${newVehicleId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': vendorId
        }
      });
      const deleteData = await deleteResponse.json();
      console.log('Status:', deleteResponse.status);
      console.log('Response:', JSON.stringify(deleteData, null, 2));
    }

    // 9. 업체 정보 수정 테스트
    console.log('\n9. PUT /api/vendor/info (업체 정보 수정)');
    const updateInfoResponse = await fetch(`${baseURL}/api/vendor/info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': vendorId
      },
      body: JSON.stringify({
        userId: vendorId,
        name: '제주렌트카 (수정됨)',
        contact_person: '김제주',
        contact_email: 'jeju@rent.com',
        contact_phone: '064-123-4567',
        address: '제주특별자치도 제주시 연동'
      })
    });
    const updateInfoData = await updateInfoResponse.json();
    console.log('Status:', updateInfoResponse.status);
    console.log('Response:', JSON.stringify(updateInfoData, null, 2));

    console.log('\n✅ 모든 API 테스트 완료!');
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
  }
}

testVendorAPIs();
