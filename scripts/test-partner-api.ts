// 파트너 신청 API 테스트
import 'dotenv/config';

async function testPartnerApplyAPI() {
  const testData = {
    businessName: 'API 테스트 업체',
    contactName: '홍길동',
    email: 'test@example.com',
    phone: '010-1234-5678',
    businessNumber: '123-45-67890',
    address: '전라남도 신안군 증도면 증도로 123',
    location: '신안군 증도면',
    latitude: 34.9876,
    longitude: 126.1234,
    coordinates: '34.9876,126.1234',
    website: 'https://example.com',
    instagram: 'https://instagram.com/test',
    services: 'accommodation,tour',
    description: '신안 여행의 중심, API 테스트 업체입니다. 증도를 비롯한 신안의 아름다운 섬들을 소개하며, 고객님들에게 최상의 서비스를 제공합니다.',
    businessHours: '매일 09:00-18:00',
    discountRate: '10'
  };

  try {
    console.log('파트너 신청 API 테스트 시작...\n');
    console.log('요청 데이터:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:3004/api/partners/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('\n응답 상태:', response.status, response.statusText);

    const result = await response.json();
    console.log('응답 데이터:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('\n✅ 파트너 신청 API 테스트 성공!');
      console.log('신청 ID:', result.applicationId);
    } else {
      console.log('\n❌ 파트너 신청 API 테스트 실패!');
      console.log('에러:', result.error || result.message);
    }
  } catch (error) {
    console.error('\n❌ API 호출 실패:', error);
  }
}

testPartnerApplyAPI();
