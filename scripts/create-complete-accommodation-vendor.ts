/**
 * 완전한 숙박 업체 생성 및 테스트 스크립트
 *
 * 테스트 시나리오:
 * 1. 벤더 계정 생성
 * 2. PMS API 시뮬레이션으로 69개 객실 생성
 * 3. 객실 수정/삭제/CSV 추가
 * 4. 업체 정보 수정 (이미지, 상세정보)
 * 5. 사용자 예약 및 결제 테스트
 */

const BASE_URL = 'http://localhost:3000';

// 색상 출력
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step: number, message: string) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`STEP ${step}: ${message}`, colors.bright + colors.cyan);
  log('='.repeat(60), colors.cyan);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

// ============================================
// STEP 1: 벤더 계정 생성
// ============================================
async function createVendorAccount() {
  logStep(1, '숙박 벤더 계정 생성');

  const vendorData = {
    email: `hotel.paradise.${Date.now()}@test.com`,
    password: 'Paradise123!',
    business_name: '파라다이스 호텔 제주',
    contact_name: '김호텔',
    contact_phone: '064-123-4567',
    business_number: '123-45-67890',
    vendor_code: `PARADISE_${Date.now()}`,
    description: '제주도 최고급 리조트 호텔입니다. 아름다운 바다 전망과 최상의 서비스를 제공합니다.',
    address: '제주특별자치도 서귀포시 중문관광로 72번길 38',
    logo_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    pms_provider: 'cloudbeds',
    pms_api_key: 'cbat_test_' + Math.random().toString(36).substring(7),
    pms_property_id: 'PARADISE_JEJU_001',
    status: 'active'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/admin/accommodation-vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendorData)
    });

    const result = await response.json();

    if (result.success && result.data) {
      logSuccess(`벤더 생성 완료: ${vendorData.business_name}`);
      logInfo(`벤더 ID: ${result.data.id}`);
      logInfo(`이메일: ${vendorData.email}`);
      logInfo(`PMS: ${vendorData.pms_provider}`);
      return { vendor: result.data, credentials: { email: vendorData.email, password: vendorData.password } };
    } else {
      logError(`벤더 생성 실패: ${result.error}`);
      return null;
    }
  } catch (error) {
    logError(`API 호출 오류: ${error.message}`);
    return null;
  }
}

// ============================================
// STEP 2: PMS API 시뮬레이션으로 69개 객실 생성
// ============================================
async function createRoomsViaPMS(vendorId: number) {
  logStep(2, 'PMS API 시뮬레이션으로 69개 객실 생성');

  const roomTypes = [
    { type: 'standard', name: '스탠다드 룸', count: 25, price: 120000 },
    { type: 'deluxe', name: '디럭스 룸', count: 20, price: 180000 },
    { type: 'suite', name: '스위트 룸', count: 15, price: 300000 },
    { type: 'villa', name: '프라이빗 빌라', count: 9, price: 500000 }
  ];

  let totalCreated = 0;

  for (const roomType of roomTypes) {
    logInfo(`\n${roomType.name} ${roomType.count}개 생성 중...`);

    for (let i = 1; i <= roomType.count; i++) {
      const roomNumber = `${roomType.type.substring(0, 1).toUpperCase()}${String(totalCreated + i).padStart(3, '0')}`;

      const roomData = {
        vendor_id: vendorId,
        room_code: roomNumber,
        room_name: `${roomType.name} ${roomNumber}`,
        room_type: roomType.type,
        floor: Math.floor((totalCreated + i - 1) / 10) + 1,
        room_number: roomNumber,
        capacity: roomType.type === 'villa' ? 6 : roomType.type === 'suite' ? 4 : 2,
        bed_type: roomType.type === 'standard' ? 'double' : 'king',
        bed_count: roomType.type === 'suite' ? 2 : 1,
        size_sqm: roomType.type === 'villa' ? 150 : roomType.type === 'suite' ? 80 : roomType.type === 'deluxe' ? 50 : 35,
        base_price_per_night: roomType.price,
        weekend_surcharge: 20000,
        view_type: i % 3 === 0 ? 'ocean' : i % 3 === 1 ? 'garden' : 'city',
        has_balcony: roomType.type !== 'standard',
        breakfast_included: false,
        wifi_available: true,
        tv_available: true,
        minibar_available: roomType.type !== 'standard',
        air_conditioning: true,
        heating: true,
        bathroom_type: roomType.type === 'villa' ? 'jacuzzi' : roomType.type === 'suite' ? 'bathtub' : 'shower',
        description: `아름다운 ${roomType.name}입니다. 편안한 휴식과 최상의 서비스를 제공합니다.`,
        amenities: JSON.stringify(['WiFi', 'TV', 'Air Conditioning', roomType.type !== 'standard' ? 'Minibar' : null].filter(Boolean)),
        images: JSON.stringify([
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        ]),
        is_available: true,
        max_occupancy: roomType.type === 'villa' ? 6 : roomType.type === 'suite' ? 4 : 2,
        min_nights: 1,
        max_nights: 30
      };

      try {
        const response = await fetch(`${BASE_URL}/api/admin/accommodation-rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roomData)
        });

        const result = await response.json();

        if (result.success) {
          process.stdout.write('.');
        } else {
          logError(`\n객실 생성 실패 (${roomNumber}): ${result.error}`);
        }
      } catch (error) {
        logError(`\nAPI 호출 오류 (${roomNumber}): ${error.message}`);
      }
    }

    totalCreated += roomType.count;
    logSuccess(`\n${roomType.name} ${roomType.count}개 생성 완료`);
  }

  logSuccess(`\n총 ${totalCreated}개 객실 생성 완료!`);
  return totalCreated;
}

// ============================================
// STEP 3: 객실 조회 및 확인
// ============================================
async function getRooms(vendorId: number) {
  logStep(3, '생성된 객실 조회 및 확인');

  try {
    const response = await fetch(`${BASE_URL}/api/admin/accommodation-rooms?vendor_id=${vendorId}`);
    const result = await response.json();

    if (result.success && result.data) {
      const rooms = result.data;
      logSuccess(`총 ${rooms.length}개 객실 조회됨`);

      // 타입별 통계
      const stats: Record<string, number> = {};
      rooms.forEach((room: any) => {
        stats[room.room_type] = (stats[room.room_type] || 0) + 1;
      });

      logInfo('\n객실 타입별 통계:');
      Object.entries(stats).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}개`);
      });

      return rooms;
    } else {
      logError(`객실 조회 실패: ${result.error}`);
      return [];
    }
  } catch (error) {
    logError(`API 호출 오류: ${error.message}`);
    return [];
  }
}

// ============================================
// STEP 4: 객실 수정 테스트
// ============================================
async function updateRoom(roomId: number) {
  logStep(4, '객실 정보 수정 테스트');

  const updateData = {
    base_price_per_night: 250000,
    description: '업데이트된 설명: 리노베이션을 거쳐 더욱 쾌적해진 객실입니다.',
    amenities: JSON.stringify(['WiFi', 'TV', 'Air Conditioning', 'Minibar', 'Coffee Machine'])
  };

  try {
    const response = await fetch(`${BASE_URL}/api/admin/rooms/${roomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();

    if (result.success) {
      logSuccess('객실 정보 수정 완료');
      logInfo(`가격: ₩250,000 으로 변경`);
      logInfo(`어메니티: Coffee Machine 추가`);
      return true;
    } else {
      logError(`객실 수정 실패: ${result.error}`);
      return false;
    }
  } catch (error) {
    logError(`API 호출 오류: ${error.message}`);
    return false;
  }
}

// ============================================
// STEP 5: 객실 삭제 테스트
// ============================================
async function deleteRoom(roomId: number) {
  logStep(5, '객실 삭제 테스트');

  try {
    const response = await fetch(`${BASE_URL}/api/admin/rooms/${roomId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      logSuccess('객실 삭제 완료');
      return true;
    } else {
      logError(`객실 삭제 실패: ${result.error}`);
      return false;
    }
  } catch (error) {
    logError(`API 호출 오류: ${error.message}`);
    return false;
  }
}

// ============================================
// STEP 6: CSV로 객실 추가
// ============================================
async function addRoomsViaCSV(vendorId: number) {
  logStep(6, 'CSV로 추가 객실 생성');

  const csvData = `room_code,room_name,room_type,capacity,base_price_per_night,description
P001,프리미엄 스위트 P001,suite,4,350000,최상층 프리미엄 스위트
P002,프리미엄 스위트 P002,suite,4,350000,최상층 프리미엄 스위트
P003,프리미엄 디럭스 P003,deluxe,2,220000,프리미엄 디럭스 룸`;

  logInfo('CSV 데이터:');
  console.log(csvData);

  // CSV 파싱 및 객실 생성
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  let created = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const roomData: any = { vendor_id: vendorId };

    headers.forEach((header, index) => {
      roomData[header.trim()] = values[index]?.trim();
    });

    // 추가 필드 설정
    roomData.is_available = true;
    roomData.wifi_available = true;
    roomData.images = JSON.stringify([]);

    try {
      const response = await fetch(`${BASE_URL}/api/admin/accommodation-rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      });

      const result = await response.json();

      if (result.success) {
        created++;
        logSuccess(`객실 생성: ${roomData.room_name}`);
      } else {
        logError(`객실 생성 실패 (${roomData.room_name}): ${result.error}`);
      }
    } catch (error) {
      logError(`API 호출 오류: ${error.message}`);
    }
  }

  logSuccess(`\nCSV를 통해 ${created}개 객실 추가 완료`);
  return created;
}

// ============================================
// STEP 7: 업체 정보 수정
// ============================================
async function updateVendorInfo(vendorId: number) {
  logStep(7, '업체 정보 수정 (이미지, 상세정보)');

  const updateData = {
    business_name: '파라다이스 호텔 제주 (리뉴얼)',
    description: '제주도 최고급 5성급 리조트 호텔입니다. 2024년 리노베이션을 거쳐 더욱 럭셔리하게 재탄생했습니다. 아름다운 바다 전망, 인피니티 풀, 최상의 서비스를 제공합니다.',
    logo_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FAP0iDve/7ExvAAAAAElFTkSuQmCC',
    contact_phone: '064-123-9999',
    check_in_time: '15:00',
    check_out_time: '11:00',
    policies: '체크인: 15:00 / 체크아웃: 11:00\n반려동물 동반 불가\n전 객실 금연'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/admin/accommodation-vendors/${vendorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();

    if (result.success) {
      logSuccess('업체 정보 수정 완료');
      logInfo('업체명: 파라다이스 호텔 제주 (리뉴얼)');
      logInfo('연락처: 064-123-9999');
      logInfo('체크인/아웃: 15:00 / 11:00');
      return true;
    } else {
      logError(`업체 정보 수정 실패: ${result.error}`);
      return false;
    }
  } catch (error) {
    logError(`API 호출 오류: ${error.message}`);
    return false;
  }
}

// ============================================
// STEP 8: 사용자 예약 및 결제 테스트
// ============================================
async function testUserBookingFlow(rooms: any[]) {
  logStep(8, '사용자 예약 및 결제 전체 플로우 테스트');

  if (rooms.length === 0) {
    logError('예약 가능한 객실이 없습니다.');
    return false;
  }

  const testRoom = rooms[0];
  logInfo(`테스트 객실: ${testRoom.room_name} (₩${testRoom.base_price_per_night?.toLocaleString()})`);

  // 1. 사용자 계정 생성 (또는 기존 계정 사용)
  const testUser = {
    email: `testuser.${Date.now()}@test.com`,
    name: '테스트 사용자',
    phone: '010-1234-5678'
  };

  logInfo('\n1. 사용자 정보:');
  console.log(`   이메일: ${testUser.email}`);
  console.log(`   이름: ${testUser.name}`);

  // 2. 예약 정보
  const bookingData = {
    room_id: testRoom.id,
    accommodation_vendor_id: testRoom.vendor_id,
    user_email: testUser.email,
    user_name: testUser.name,
    user_phone: testUser.phone,
    check_in_date: '2025-02-01',
    check_out_date: '2025-02-03',
    guests: 2,
    total_price: testRoom.base_price_per_night * 2, // 2박
    status: 'pending'
  };

  logInfo('\n2. 예약 정보:');
  console.log(`   체크인: ${bookingData.check_in_date}`);
  console.log(`   체크아웃: ${bookingData.check_out_date}`);
  console.log(`   총 금액: ₩${bookingData.total_price.toLocaleString()}`);

  // 예약 생성 API가 있는지 확인 필요
  logInfo('\n3. 예약 생성 시도...');
  logError('⚠ 예약 생성 API 엔드포인트 확인 필요!');
  logInfo('   필요한 API: POST /api/bookings 또는 POST /api/accommodations/book');

  return false; // 예약 API 확인 필요
}

// ============================================
// MAIN
// ============================================
async function main() {
  log('\n' + '🏨'.repeat(30), colors.bright);
  log('숙박 업체 완전 생성 및 테스트', colors.bright + colors.cyan);
  log('🏨'.repeat(30) + '\n', colors.bright);

  try {
    // Step 1: 벤더 계정 생성
    const vendorResult = await createVendorAccount();
    if (!vendorResult) {
      logError('\n테스트 중단: 벤더 생성 실패');
      return;
    }

    const { vendor } = vendorResult;
    const vendorId = vendor.id;

    // Step 2: 69개 객실 생성
    await createRoomsViaPMS(vendorId);

    // 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: 객실 조회
    const rooms = await getRooms(vendorId);

    if (rooms.length > 0) {
      // Step 4: 첫 번째 객실 수정
      await updateRoom(rooms[0].id);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 5: 마지막 객실 삭제
      await deleteRoom(rooms[rooms.length - 1].id);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 6: CSV로 3개 추가
      await addRoomsViaCSV(vendorId);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 7: 업체 정보 수정
    await updateVendorInfo(vendorId);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 8: 최종 객실 조회
    const finalRooms = await getRooms(vendorId);

    // Step 9: 예약 및 결제 테스트
    await testUserBookingFlow(finalRooms);

    // 최종 요약
    log('\n' + '='.repeat(60), colors.cyan);
    log('테스트 완료 요약', colors.bright + colors.cyan);
    log('='.repeat(60), colors.cyan);
    logSuccess(`✓ 벤더 생성 완료: ${vendor.business_name}`);
    logSuccess(`✓ 벤더 ID: ${vendorId}`);
    logSuccess(`✓ 최종 객실 수: ${finalRooms.length}개`);
    logInfo('\n다음 단계:');
    console.log('  1. 예약 생성 API 구현 확인');
    console.log('  2. 결제 시스템 연동 확인');
    console.log('  3. 사용자 예약 플로우 완성');

  } catch (error) {
    logError(`\n치명적 오류 발생: ${error.message}`);
    console.error(error);
  }
}

// 실행
main();
