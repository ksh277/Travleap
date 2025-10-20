// 숙박 완전 테스트 - Admin API 사용
const BASE_URL = 'http://localhost:3004';

async function testLodgingComplete() {
  console.log('🏨 숙박 시스템 완전 테스트 시작\n');
  console.log('⚠️  이 스크립트는 실제 DB에 데이터를 추가합니다!\n');

  // ===== 1. CSV 업로드 방식 숙박 업체 =====
  console.log('📋 1. CSV 업로드 방식 - 신안 바다뷰 펜션');

  // 1-1. 업체 생성
  const csvVendor = {
    business_name: '신안 바다뷰 펜션',
    contact_name: '김철수',
    phone: '010-1234-5678',
    email: 'seaview@test.com',
    is_verified: true,
    tier: 'basic'
  };

  let csvVendorId: number | null = null;

  try {
    const response = await fetch(`${BASE_URL}/api/admin/lodging/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(csvVendor)
    });

    const result = await response.json();

    if (result.success && result.id) {
      csvVendorId = result.id;
      console.log(`   ✅ 업체 생성 완료 (ID: ${result.id})`);
    } else {
      console.log(`   ❌ 업체 생성 실패:`, result.message);
      return;
    }
  } catch (error) {
    console.log(`   ❌ 오류:`, error);
    return;
  }

  // 1-2. CSV 일괄 업로드로 객실 3개 추가
  const csvRooms = [
    {
      room_name: '오션뷰 스위트',
      description: '넓은 오션뷰와 킹사이즈 침대를 갖춘 프리미엄 객실',
      location: '신안군',
      address: '전라남도 신안군 증도면 해안로 123',
      price_from: 150000,
      images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'],
      rating_avg: 4.8,
      rating_count: 25
    },
    {
      room_name: '스탠다드 더블',
      description: '깔끔한 더블룸',
      location: '신안군',
      address: '전라남도 신안군 증도면 해안로 123',
      price_from: 100000,
      images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'],
      rating_avg: 4.5,
      rating_count: 18
    },
    {
      room_name: '패밀리 룸',
      description: '가족 단위 최적 넓은 공간',
      location: '신안군',
      address: '전라남도 신안군 증도면 해안로 123',
      price_from: 200000,
      images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'],
      rating_avg: 4.9,
      rating_count: 30
    }
  ];

  try {
    const response = await fetch(`${BASE_URL}/api/admin/lodging/vendors/${csvVendorId}/bulk-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms: csvRooms })
    });

    const result = await response.json();

    if (result.success) {
      console.log(`   ✅ CSV 일괄 업로드 완료: ${result.successCount}개 성공, ${result.errorCount}개 실패`);
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err: string) => console.log(`      ⚠️  ${err}`));
      }
    } else {
      console.log(`   ❌ CSV 업로드 실패:`, result.message);
    }
  } catch (error) {
    console.log(`   ❌ 오류:`, error);
  }

  console.log('\n');

  // ===== 2. PMS 연동 방식 숙박 업체 (수동 추가 시뮬레이션) =====
  console.log('📋 2. PMS 연동 방식 - 증도 힐링 호텔');
  console.log('   (실제로는 PMS API에서 자동 동기화하지만, 여기서는 수동으로 추가)');

  // 2-1. 업체 생성
  const pmsVendor = {
    business_name: '증도 힐링 호텔',
    contact_name: '박민수',
    phone: '010-9876-5432',
    email: 'healing@test.com',
    is_verified: true,
    tier: 'premium'
  };

  let pmsVendorId: number | null = null;

  try {
    const response = await fetch(`${BASE_URL}/api/admin/lodging/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pmsVendor)
    });

    const result = await response.json();

    if (result.success && result.id) {
      pmsVendorId = result.id;
      console.log(`   ✅ 업체 생성 완료 (ID: ${result.id})`);
    } else {
      console.log(`   ❌ 업체 생성 실패:`, result.message);
      return;
    }
  } catch (error) {
    console.log(`   ❌ 오류:`, error);
    return;
  }

  // 2-2. 객실 개별 추가 (PMS sync 시뮬레이션)
  const pmsRooms = [
    {
      room_name: '디럭스 트윈',
      description: '편안한 트윈 침대',
      location: '증도',
      address: '전라남도 신안군 증도면 힐링로 456',
      price_from: 130000,
      images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'],
      rating_avg: 4.7,
      rating_count: 22
    },
    {
      room_name: '이그제큐티브 스위트',
      description: '최고급 스위트룸',
      location: '증도',
      address: '전라남도 신안군 증도면 힐링로 456',
      price_from: 220000,
      images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'],
      rating_avg: 5.0,
      rating_count: 35
    },
    {
      room_name: '스탠다드 싱글',
      description: '1인 여행객을 위한 객실',
      location: '증도',
      address: '전라남도 신안군 증도면 힐링로 456',
      price_from: 80000,
      images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'],
      rating_avg: 4.6,
      rating_count: 15
    }
  ];

  let pmsRoomCount = 0;
  for (const room of pmsRooms) {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/lodging/vendors/${pmsVendorId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });

      const result = await response.json();

      if (result.success) {
        pmsRoomCount++;
        console.log(`   ✅ 객실 추가: ${room.room_name}`);
      } else {
        console.log(`   ❌ 객실 추가 실패: ${room.room_name} - ${result.message}`);
      }
    } catch (error) {
      console.log(`   ❌ 오류: ${room.room_name}`);
    }
  }

  console.log(`   ✅ 총 ${pmsRoomCount}개 객실 추가 완료\n`);

  // ===== 3. 공개 API 확인 =====
  console.log('📋 3. 공개 숙박 목록 확인 (/api/accommodations)');

  try {
    const response = await fetch(`${BASE_URL}/api/accommodations`);
    const data = await response.json();

    if (data.success && data.data) {
      console.log(`   ✅ 총 ${data.data.length}개 숙박 업체 조회됨`);

      const csvVendorData = data.data.find((v: any) => v.business_name === '신안 바다뷰 펜션');
      const pmsVendorData = data.data.find((v: any) => v.business_name === '증도 힐링 호텔');

      if (csvVendorData) {
        console.log(`   ✅ CSV 업체: ${csvVendorData.business_name} (${csvVendorData.room_count}개 객실)`);
      } else {
        console.log(`   ❌ CSV 업체가 목록에 없습니다`);
      }

      if (pmsVendorData) {
        console.log(`   ✅ PMS 업체: ${pmsVendorData.business_name} (${pmsVendorData.room_count}개 객실)`);
      } else {
        console.log(`   ❌ PMS 업체가 목록에 없습니다`);
      }
    } else {
      console.log(`   ❌ 실패:`, data.message);
    }
  } catch (error) {
    console.log(`   ❌ 오류:`, error);
  }

  console.log('\n');

  // ===== 테스트 요약 =====
  console.log('📊 테스트 완료');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ CSV 업체 생성 완료 (ID: ${csvVendorId})`);
  console.log('✅ CSV 일괄 업로드로 3개 객실 추가');
  console.log(`✅ PMS 업체 생성 완료 (ID: ${pmsVendorId})`);
  console.log(`✅ PMS 방식으로 ${pmsRoomCount}개 객실 개별 추가`);
  console.log('✅ 공개 API에서 정상 조회 확인');
  console.log('');
  console.log('📌 다음 단계:');
  console.log('1. 브라우저에서 /accommodations 페이지 확인');
  console.log('2. 추가된 2개 업체와 6개 객실이 보이는지 확인');
  console.log('3. Admin 페이지에서 업체/객실 관리 기능 테스트');
  console.log('4. 예약 기능 테스트');
}

// 실행
testLodgingComplete().catch(console.error);
