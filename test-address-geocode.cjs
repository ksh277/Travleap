/**
 * 카카오 Geocoding API 테스트
 * 주소: 전남 신안군 증도면 소악길 15 (소악도 민박)
 */

require('dotenv').config();
const fetch = require('node-fetch');

const KAKAO_API_KEY = '8d901d330280f34d870802c3e8cc5e9d'; // JavaScript 키

async function testGeocode(address) {
  console.log(`\n🔍 주소 검색: ${address}\n`);

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`
        }
      }
    );

    const data = await response.json();

    console.log('📡 API 응답 상태:', response.status, response.statusText);
    console.log('📦 응답 데이터:', JSON.stringify(data, null, 2));

    if (data.documents && data.documents.length > 0) {
      const result = data.documents[0];
      console.log('\n✅ 좌표 검색 성공!');
      console.log(`📍 주소명: ${result.address_name}`);
      console.log(`📍 위도 (lat): ${result.y}`);
      console.log(`📍 경도 (lng): ${result.x}`);
      console.log(`\n🗺️  Google Maps 링크: https://www.google.com/maps?q=${result.y},${result.x}`);

      return {
        lat: parseFloat(result.y),
        lng: parseFloat(result.x),
        address_name: result.address_name
      };
    } else {
      console.log('❌ 좌표를 찾을 수 없습니다.');
      return null;
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    return null;
  }
}

// 테스트 주소들
const testAddresses = [
  '전남 신안군 증도면 소악길 15',
  '신안군 증도면 소악길 15',
  '전라남도 신안군 증도면 소악길 15',
  '전남 목포시 통일대로 11'
];

async function runTests() {
  console.log('=' .repeat(60));
  console.log('🚀 카카오 Geocoding API 테스트');
  console.log('=' .repeat(60));

  for (const address of testAddresses) {
    await testGeocode(address);
    console.log('\n' + '-'.repeat(60));
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
  }
}

runTests();
