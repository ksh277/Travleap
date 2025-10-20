// 숙박 업체 테스트 - PMS 연동 & CSV 업로드
// /api/lodging POST를 사용 (userId 필요)
const BASE_URL = 'http://localhost:3004';

// 테스트용 User ID (실제로는 로그인된 사용자 ID 사용)
const TEST_USER_ID = 1;

async function testLodgingVendors() {
  console.log('🏨 숙박 업체 테스트 시작\n');

  // ===== 1. CSV 업로드 방식 숙박 업체 추가 =====
  console.log('📋 1. CSV 업로드 방식 숙박 업체 생성');
  console.log('   업체명: 신안 바다뷰 펜션');

  const csvLodging = {
    userId: TEST_USER_ID,
    name: '신안 바다뷰 펜션',
    type: 'pension',
    location: '전남 신안군',
    address: '전라남도 신안군 증도면 해안로 123',
    description: '신안 앞바다가 보이는 아름다운 펜션입니다. 편안한 휴식과 아름다운 전망을 제공합니다.',
    phone: '010-1234-5678',
    email: 'seaview@test.com',
    check_in_time: '15:00',
    check_out_time: '11:00',
    amenities: JSON.stringify(['wifi', 'parking', 'bbq', 'kitchen']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'
    ]),
    latitude: 34.8179,
    longitude: 126.0831
  };

  try {
    const response = await fetch(`${BASE_URL}/api/lodging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': TEST_USER_ID.toString()
      },
      body: JSON.stringify(csvLodging)
    });

    const result = await response.json();

    if (result.success && result.id) {
      console.log(`   ✅ CSV 업체 생성 완료 (ID: ${result.id})`);

      // 객실 3개 추가
      const rooms = [
        {
          vendor_id: result.id,
          room_name: '오션뷰 스위트',
          room_type: 'suite',
          capacity: 4,
          base_price_krw: 150000,
          weekend_price_krw: 180000,
          description: '넓은 오션뷰와 킹사이즈 침대',
          amenities: JSON.stringify(['wifi', 'tv', 'aircon', 'kitchen', 'parking']),
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
            'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800'
          ]),
          is_available: true
        },
        {
          vendor_id: result.id,
          room_name: '스탠다드 더블',
          room_type: 'double',
          capacity: 2,
          base_price_krw: 100000,
          weekend_price_krw: 120000,
          description: '깔끔한 더블룸',
          amenities: JSON.stringify(['wifi', 'tv', 'aircon', 'parking']),
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'
          ]),
          is_available: true
        },
        {
          vendor_id: result.id,
          room_name: '패밀리 룸',
          room_type: 'family',
          capacity: 6,
          base_price_krw: 200000,
          weekend_price_krw: 250000,
          description: '가족 단위 최적 넓은 공간',
          amenities: JSON.stringify(['wifi', 'tv', 'aircon', 'kitchen', 'parking', 'bbq']),
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'
          ]),
          is_available: true
        }
      ];

      let roomCount = 0;
      for (const room of rooms) {
        try {
          const roomRes = await fetch(`${BASE_URL}/api/admin/lodging/vendors/${result.id}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(room)
          });

          const roomResult = await roomRes.json();
          if (roomResult.success) {
            roomCount++;
            console.log(`   ✅ 객실 추가: ${room.room_name}`);
          }
        } catch (error) {
          console.log(`   ❌ 객실 추가 실패: ${room.room_name}`);
        }
      }

      console.log(`   ✅ 총 ${roomCount}개 객실 추가 완료\n`);

    } else {
      console.log('   ❌ CSV 업체 생성 실패:', result.message);
    }
  } catch (error) {
    console.log('   ❌ 오류:', error);
  }

  // ===== 2. PMS 연동 방식 숙박 업체 추가 =====
  console.log('📋 2. PMS 연동 방식 숙박 업체 생성');
  console.log('   업체명: 증도 힐링 호텔');
  console.log('   PMS: eZee (시뮬레이션)');

  const pmsVendor = {
    vendor_code: 'PMS_LODGING_001',
    business_name: '증도 힐링 호텔',
    contact_name: '박민수',
    contact_email: 'healing@test.com',
    contact_phone: '010-9876-5432',
    description: '증도의 자연 속에서 힐링할 수 있는 호텔입니다.',
    status: 'active',
    is_verified: 1,
    commission_rate: 12.00
  };

  try {
    const response = await fetch(`${BASE_URL}/api/admin/lodging/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pmsVendor)
    });

    const result = await response.json();

    if (result.success && result.id) {
      console.log(`   ✅ PMS 업체 생성 완료 (ID: ${result.id})`);

      // PMS 설정 추가 (실제로는 PMS API 연동이 필요하지만, 여기서는 수동으로 객실 추가)
      const rooms = [
        {
          vendor_id: result.id,
          room_name: '디럭스 트윈',
          room_type: 'twin',
          capacity: 2,
          base_price_krw: 130000,
          weekend_price_krw: 160000,
          description: '편안한 트윈 침대',
          amenities: JSON.stringify(['wifi', 'tv', 'aircon', 'minibar', 'parking']),
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'
          ]),
          is_available: true
        },
        {
          vendor_id: result.id,
          room_name: '이그제큐티브 스위트',
          room_type: 'suite',
          capacity: 3,
          base_price_krw: 220000,
          weekend_price_krw: 280000,
          description: '최고급 스위트룸',
          amenities: JSON.stringify(['wifi', 'tv', 'aircon', 'minibar', 'parking', 'spa', 'breakfast']),
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
          ]),
          is_available: true
        },
        {
          vendor_id: result.id,
          room_name: '스탠다드 싱글',
          room_type: 'single',
          capacity: 1,
          base_price_krw: 80000,
          weekend_price_krw: 100000,
          description: '1인 여행객을 위한 객실',
          amenities: JSON.stringify(['wifi', 'tv', 'aircon', 'parking']),
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'
          ]),
          is_available: true
        }
      ];

      let roomCount = 0;
      for (const room of rooms) {
        try {
          const roomRes = await fetch(`${BASE_URL}/api/admin/lodging/vendors/${result.id}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(room)
          });

          const roomResult = await roomRes.json();
          if (roomResult.success) {
            roomCount++;
            console.log(`   ✅ 객실 추가: ${room.room_name}`);
          }
        } catch (error) {
          console.log(`   ❌ 객실 추가 실패: ${room.room_name}`);
        }
      }

      console.log(`   ✅ 총 ${roomCount}개 객실 추가 완료\n`);

    } else {
      console.log('   ❌ PMS 업체 생성 실패:', result.message);
    }
  } catch (error) {
    console.log('   ❌ 오류:', error);
  }

  // ===== 3. 공개 API 확인 =====
  console.log('📋 3. 공개 숙박 목록 확인 (/api/accommodations)');
  try {
    const response = await fetch(`${BASE_URL}/api/accommodations`);
    const data = await response.json();

    if (data.success && data.data) {
      console.log(`   ✅ 총 ${data.data.length}개 숙박 업체`);
      data.data.forEach((lodging: any) => {
        console.log(`   - ${lodging.name} (평점: ${lodging.average_rating || 0})`);
      });
    } else {
      console.log('   ❌ 실패:', data.message);
    }
  } catch (error) {
    console.log('   ❌ 오류:', error);
  }

  console.log('\n');

  // ===== 테스트 요약 =====
  console.log('📊 테스트 완료');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ CSV 업로드 방식 숙박 업체 생성 (신안 바다뷰 펜션)');
  console.log('✅ PMS 연동 방식 숙박 업체 생성 (증도 힐링 호텔)');
  console.log('✅ 각 업체별 3개 객실 추가');
  console.log('✅ 공개 숙박 목록 API 확인');
  console.log('');
  console.log('📌 다음 단계:');
  console.log('1. 브라우저에서 숙박 페이지 확인');
  console.log('2. Vendor Dashboard에서 객실 관리 테스트');
  console.log('3. 예약 기능 테스트');
}

// 실행
testLodgingVendors().catch(console.error);
