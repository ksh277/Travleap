import 'dotenv/config';

const API_URL = process.env.VITE_API_URL || 'https://travleap.vercel.app';

async function testPartnerCreate() {
  console.log('🧪 Testing Partner Creation API...\n');
  console.log(`API URL: ${API_URL}\n`);

  // 실제 파트너 데이터
  const testPartner = {
    business_name: '신안 바다여행사',
    contact_name: '김철수',
    email: 'kim@shinan-travel.com',
    phone: '061-123-4567',
    business_address: '전라남도 신안군 지도읍 읍내리 123-45',
    location: '전라남도 신안군',
    detailed_address: '전라남도 신안군 지도읍 읍내리 123-45',
    services: '갯벌 체험, 섬 투어, 낚시 체험, 자전거 여행',
    base_price: 50000,
    description: '신안의 아름다운 섬들을 탐험하는 특별한 여행 경험을 제공합니다. 1004개의 섬으로 이루어진 신안의 매력을 느껴보세요.',
    images: [
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%234A90E2" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E신안 바다여행사%3C/text%3E%3C/svg%3E'
    ],
    business_hours: '평일 09:00-18:00, 주말 09:00-17:00'
  };

  try {
    console.log('📤 Sending POST request to /api/admin/partners...\n');
    console.log('Request body:', JSON.stringify(testPartner, null, 2));
    console.log('\n');

    const response = await fetch(`${API_URL}/api/admin/partners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPartner)
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}\n`);

    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}\n`);

    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log('✅ Response JSON:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('\n🎉 Partner created successfully!');
        console.log(`Partner ID: ${result.data.id}`);
      } else {
        console.log('\n❌ Failed to create partner');
        console.log(`Error: ${result.error || result.message}`);
      }
    } else {
      const text = await response.text();
      console.log('❌ Response is not JSON:');
      console.log(text.substring(0, 500));
    }
  } catch (error) {
    console.error('\n💥 Error:', error);
  }
}

testPartnerCreate();
