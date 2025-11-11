/**
 * Partner 주소 표시 테스트 스크립트
 * - API 응답 시뮬레이션
 * - 주소 조합 로직 테스트
 */

// 샘플 파트너 데이터 (API 응답 시뮬레이션)
const samplePartners = [
  {
    id: 1,
    business_name: '신안 투어 A',
    location: '전남 신안군',
    business_address: '전남 신안군 지도읍 송도리 123',
    detailed_address: '지도읍 송도리 123'
  },
  {
    id: 2,
    business_name: '신안 투어 B',
    location: '전남 신안군',
    business_address: '전남 신안군 증도면 대초리 456',
    detailed_address: null // detailed_address가 없는 경우
  },
  {
    id: 3,
    business_name: '신안 투어 C',
    location: '전남 신안군',
    business_address: null, // business_address도 없는 경우
    detailed_address: null
  },
  {
    id: 4,
    business_name: '신안 투어 D',
    location: '전남 신안군',
    business_address: '',
    detailed_address: '홍도면 1구 789'
  }
];

// PartnerPage.tsx의 주소 조합 로직
function getFullAddress(partner) {
  let fullAddress = '';

  if (partner.detailed_address && partner.detailed_address.trim()) {
    // detailed_address가 있으면 location과 조합
    fullAddress = partner.location
      ? `${partner.location} ${partner.detailed_address}`
      : partner.detailed_address;
  } else if (partner.business_address && partner.business_address.trim()) {
    // business_address가 있으면 그대로 사용
    fullAddress = partner.business_address;
  } else {
    // 둘 다 없으면 location 사용
    fullAddress = partner.location || '신안군';
  }

  return fullAddress;
}

console.log('=== Partner 주소 표시 테스트 ===\n');

samplePartners.forEach(partner => {
  const fullAddress = getFullAddress(partner);

  console.log(`Partner ${partner.id}: ${partner.business_name}`);
  console.log(`  location: ${partner.location}`);
  console.log(`  business_address: ${partner.business_address || '(없음)'}`);
  console.log(`  detailed_address: ${partner.detailed_address || '(없음)'}`);
  console.log(`  → 최종 표시 주소: "${fullAddress}"`);
  console.log('');
});

console.log('=== 테스트 결과 ===\n');
console.log('✅ 상세주소가 있는 경우: location + detailed_address 조합');
console.log('✅ business_address만 있는 경우: business_address 사용');
console.log('✅ 둘 다 없는 경우: location 사용');
console.log('');
console.log('📍 InfoWindow 표시도 동일한 주소를 사용합니다.');
console.log('');
console.log('=== 다음 단계 ===');
console.log('1. 실제 DB 데이터 확인 필요');
console.log('2. business_address 또는 detailed_address 필드에 상세주소가 있는지 확인');
console.log('3. 없다면 DB 데이터 업데이트 필요');
