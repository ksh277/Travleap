import 'dotenv/config';
import { db } from '../utils/database';

async function addVendors() {
  console.log('🏢 렌트카 및 숙박 업체 추가 시작...\n');

  try {
    // 1. 렌트카 업체 추가
    console.log('🚗 렌트카 업체 추가 중...');

    const rentcarVendors = [
      {
        business_name: '신안렌터카',
        contact_name: '김렌트',
        email: 'shinan.rentcar@example.com',
        phone: '061-1234-5678',
        business_number: '123-45-67890',
        address: '전남 신안군 지도읍 읍내리 123',
        location: '전남 신안군 지도읍',
        description: '신안 전 지역 렌터카 서비스를 제공하는 신안 최대 렌터카 업체입니다. 다양한 차종과 합리적인 가격으로 고객 만족도 1위를 자랑합니다.',
        services: '경차, 소형, 중형, 대형, SUV, 승합',
        website: 'https://shinan-rentcar.example.com',
        instagram: '@shinan_rentcar',
        status: 'approved',
        is_verified: 1
      },
      {
        business_name: '증도렌터카',
        contact_name: '이차량',
        email: 'jeungdo.rentcar@example.com',
        phone: '061-2345-6789',
        business_number: '234-56-78901',
        address: '전남 신안군 증도면 증도리 456',
        location: '전남 신안군 증도면',
        description: '증도 전문 렌터카 업체로 친환경 전기차와 하이브리드 차량을 주력으로 운영합니다.',
        services: '전기차, 하이브리드, 경차, 소형',
        website: 'https://jeungdo-rentcar.example.com',
        instagram: '@jeungdo_rentcar',
        status: 'approved',
        is_verified: 1
      }
    ];

    for (const vendor of rentcarVendors) {
      const result = await db.execute(`
        INSERT INTO partners
        (user_id, business_name, contact_name, email, phone, business_number, business_address, location,
         description, services, website, instagram, status, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        1, // user_id는 기본값 1 (admin)
        vendor.business_name,
        vendor.contact_name,
        vendor.email,
        vendor.phone,
        vendor.business_number,
        vendor.address,
        vendor.location,
        vendor.description,
        vendor.services,
        vendor.website,
        vendor.instagram,
        vendor.status,
        vendor.is_verified
      ]);

      console.log(`  ✅ ${vendor.business_name} 추가 완료 (Partner ID: ${result.insertId})`);
    }

    // 2. 숙박 업체 추가
    console.log('\n🏨 숙박 업체 추가 중...');

    const lodgingVendors = [
      {
        business_name: '퍼플섬 게스트하우스',
        contact_name: '박숙박',
        email: 'purple.guesthouse@example.com',
        phone: '061-3456-7890',
        business_number: '345-67-89012',
        address: '전남 신안군 안좌면 반월박지길 789',
        location: '전남 신안군 안좌면',
        description: '퍼플섬의 아름다운 전망을 자랑하는 게스트하우스입니다. 보라빛 테마로 꾸며진 객실과 친절한 서비스를 제공합니다.',
        services: '조식 제공, 무료 Wi-Fi, 주차장, 자전거 대여, 바비큐 시설',
        website: 'https://purple-guesthouse.example.com',
        instagram: '@purple_guesthouse',
        status: 'approved',
        is_verified: 1
      },
      {
        business_name: '증도 힐링펜션',
        contact_name: '최휴식',
        email: 'jeungdo.pension@example.com',
        phone: '061-4567-8901',
        business_number: '456-78-90123',
        address: '전남 신안군 증도면 태평염전길 101',
        location: '전남 신안군 증도면',
        description: '염전 풍경을 감상하며 힐링할 수 있는 프라이빗 펜션입니다. 모든 객실에서 바다 전망이 가능합니다.',
        services: '독채 펜션, 바다 전망, 조식 제공, 무료 주차, BBQ 시설, 캠핑장',
        website: 'https://jeungdo-pension.example.com',
        instagram: '@jeungdo_healing',
        status: 'approved',
        is_verified: 1
      },
      {
        business_name: '신안 비치 리조트',
        contact_name: '정리조트',
        email: 'shinan.resort@example.com',
        phone: '061-5678-9012',
        business_number: '567-89-01234',
        address: '전남 신안군 지도읍 읍내리 202',
        location: '전남 신안군 지도읍',
        description: '신안 최대 규모의 비치 리조트로 수영장, 레스토랑, 스파 등 다양한 부대시설을 갖추고 있습니다.',
        services: '수영장, 레스토랑, 스파, 피트니스, 키즈클럽, 컨퍼런스룸, 무료 셔틀',
        website: 'https://shinan-resort.example.com',
        instagram: '@shinan_beach_resort',
        status: 'approved',
        is_verified: 1
      }
    ];

    for (const vendor of lodgingVendors) {
      const result = await db.execute(`
        INSERT INTO partners
        (user_id, business_name, contact_name, email, phone, business_number, business_address, location,
         description, services, website, instagram, status, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        1, // user_id는 기본값 1 (admin)
        vendor.business_name,
        vendor.contact_name,
        vendor.email,
        vendor.phone,
        vendor.business_number,
        vendor.address,
        vendor.location,
        vendor.description,
        vendor.services,
        vendor.website,
        vendor.instagram,
        vendor.status,
        vendor.is_verified
      ]);

      console.log(`  ✅ ${vendor.business_name} 추가 완료 (Partner ID: ${result.insertId})`);
    }

    console.log('\n📊 추가 요약:');
    console.log(`  - 렌트카 업체: ${rentcarVendors.length}개`);
    console.log(`  - 숙박 업체: ${lodgingVendors.length}개`);
    console.log(`  - 총 ${rentcarVendors.length + lodgingVendors.length}개 업체 추가 완료`);

    console.log('\n✅ 모든 업체 추가 완료!');
  } catch (error) {
    console.error('❌ 업체 추가 실패:', error);
    throw error;
  }
}

// 실행
addVendors()
  .then(() => {
    console.log('\n🎉 작업 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
