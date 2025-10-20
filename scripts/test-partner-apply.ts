/**
 * 파트너 신청 테스트 스크립트
 * 2개의 파트너 신청을 제출하여 승인/거절 플로우 테스트
 */

const API_BASE = 'http://localhost:3004';

async function submitPartnerApplication(data: any) {
  try {
    const response = await fetch(`${API_BASE}/api/partners/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ 파트너 신청 성공:', data.businessName);
      console.log('   응답:', result);
    } else {
      console.log('❌ 파트너 신청 실패:', data.businessName);
      console.log('   오류:', result.message || result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ API 호출 오류:', error);
    return { success: false, error };
  }
}

async function main() {
  console.log('🚀 파트너 신청 테스트 시작\n');

  // 첫 번째 신청 (승인 테스트용)
  const partner1 = {
    businessName: '신안 맛집 식당',
    contactName: '김철수',
    email: 'chulsoo.kim@sinan-restaurant.com',
    phone: '010-1234-5678',
    businessNumber: '123-45-67890',
    location: '신안군',
    address: '전라남도 신안군 증도면 맛집로 123',
    description: '신안의 신선한 해산물을 사용한 전통 한식당입니다. 증도 특산물을 활용한 다양한 메뉴를 제공합니다.',
    services: '한식, 해산물 요리, 단체 예약 가능',
    website: 'https://sinan-restaurant.com',
    instagram: '@sinan_restaurant',
  };

  // 두 번째 신청 (거절 테스트용)
  const partner2 = {
    businessName: '증도 카페 바다',
    contactName: '이영희',
    email: 'younghee.lee@jeungdo-cafe.com',
    phone: '010-9876-5432',
    businessNumber: '987-65-43210',
    location: '신안군',
    address: '전라남도 신안군 증도면 바다길 456',
    description: '증도 바다가 한눈에 보이는 오션뷰 카페입니다. 직접 로스팅한 커피와 수제 디저트를 즐기실 수 있습니다.',
    services: '커피, 디저트, 브런치',
    website: 'https://jeungdo-cafe.com',
    instagram: '@jeungdo_cafe',
  };

  console.log('📝 첫 번째 파트너 신청 제출 (승인 테스트용)');
  await submitPartnerApplication(partner1);

  console.log('\n⏳ 1초 대기...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📝 두 번째 파트너 신청 제출 (거절 테스트용)');
  await submitPartnerApplication(partner2);

  console.log('\n✅ 파트너 신청 테스트 완료!');
  console.log('\n📋 다음 단계:');
  console.log('1. 관리자 페이지 > 파트너 관리 > 파트너 신청 현황에서 신청 확인');
  console.log('2. "신안 맛집 식당" 승인 → /partners 가맹점 페이지에 표시 확인');
  console.log('3. "증도 카페 바다" 거절 → 목록에서 사라지는지 확인');
}

main().catch(console.error);
