// AdminPage 폼 양식대로 6개 카테고리 상품 추가

const products = [
  // 1. 여행
  {
    title: '증도 노을투어',
    category: '여행',
    category_id: 1855,
    price: 45000,
    childPrice: 31500,
    infantPrice: 13500,
    location: '신안군 증도면',
    detailedAddress: '전남 신안군 증도면 태평염전길 12',
    meetingPoint: '증도 선착장 매표소 앞',
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
    description: '증도의 아름다운 노을을 감상하는 특별한 투어',
    longDescription: '염전과 갯벌을 배경으로 펼쳐지는 환상적인 일몰 풍경을 감상할 수 있습니다. 전문 가이드와 함께하는 2시간 코스로 포토존에서의 사진 촬영 시간도 포함됩니다.',
    highlights: ['전문 가이드 동행', '포토존 사진 촬영', '증도 노을 명소 투어'],
    included: ['가이드 투어', '간식 제공', '기념 사진 촬영'],
    excluded: ['개인 교통편', '식사'],
    maxCapacity: 10,
    featured: true,
    is_active: true
  },

  // 2. 음식
  {
    title: '짱뚱어 정식',
    category: '음식',
    category_id: 1858,
    price: 18000,
    childPrice: 12600,
    infantPrice: null,
    location: '신안군 압해읍',
    detailedAddress: '전남 신안군 압해읍 송공항길 45',
    meetingPoint: '짱뚱어마을 식당',
    images: ['https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800'],
    description: '신안 특산물 짱뚱어로 만든 건강 정식',
    longDescription: '신안의 청정 갯벌에서 잡은 싱싱한 짱뚱어를 다양한 방법으로 요리한 정식입니다. 짱뚱어탕, 짱뚱어튀김, 짱뚱어무침 등 다양한 메뉴가 포함됩니다.',
    highlights: ['청정 갯벌 짱뚱어', '다양한 짱뚱어 요리', '영양 만점 건강식'],
    included: ['짱뚱어탕', '짱뚱어튀김', '짱뚱어무침', '밥과 반찬'],
    excluded: ['음료', '추가 주문 메뉴'],
    maxCapacity: 50,
    featured: false,
    is_active: true
  },

  // 3. 관광지
  {
    title: '퍼플섬 입장권',
    category: '관광지',
    category_id: 1859,
    price: 5000,
    childPrice: 3000,
    infantPrice: null,
    location: '신안군 안좌면',
    detailedAddress: '전남 신안군 안좌면 반월·박지길',
    meetingPoint: '퍼플섬 입구 매표소',
    images: ['https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=800'],
    description: '보라색으로 물든 아름다운 퍼플섬 방문',
    longDescription: '보라색 꽃과 보라색으로 칠해진 집들이 있는 독특한 테마 섬입니다. 천사대교를 건너 아름다운 풍경을 감상하며 산책할 수 있습니다.',
    highlights: ['보라색 테마 포토존', '천사대교 전망', '갯벌 체험 가능'],
    included: ['입장권', '안내 지도'],
    excluded: ['체험 프로그램', '식사', '교통편'],
    maxCapacity: 200,
    featured: true,
    is_active: true
  },

  // 4. 팝업
  {
    title: '신안 소금 팝업스토어',
    category: '팝업',
    category_id: 1860,
    price: 0,
    childPrice: null,
    infantPrice: null,
    location: '신안군 증도면',
    detailedAddress: '전남 신안군 증도면 태평염전길 15',
    meetingPoint: '증도 소금박물관 앞',
    images: ['https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800'],
    description: '신안 천일염과 소금 제품을 만나는 팝업스토어',
    longDescription: '신안의 명품 천일염과 다양한 소금 가공품을 판매하는 기간 한정 팝업스토어입니다. 소금 체험 프로그램도 함께 운영됩니다.',
    highlights: ['신안 천일염 판매', '소금 체험 프로그램', '한정 기념품'],
    included: ['무료 입장', '시식 제공'],
    excluded: ['제품 구매비', '체험 프로그램비'],
    maxCapacity: 100,
    featured: false,
    is_active: true
  },

  // 5. 행사
  {
    title: '신안 튤립축제 2025',
    category: '행사',
    category_id: 1861,
    price: 10000,
    childPrice: 5000,
    infantPrice: null,
    location: '신안군 지도읍',
    detailedAddress: '전남 신안군 지도읍 읍내리 튤립단지',
    meetingPoint: '튤립축제 메인 입구',
    images: ['https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800'],
    description: '100만 송이 튤립이 피어나는 봄 축제',
    longDescription: '매년 봄 신안에서 개최되는 국내 최대 규모의 튤립 축제입니다. 100만 송이가 넘는 다양한 색상의 튤립이 장관을 이룹니다.',
    highlights: ['100만 송이 튤립', '포토존 다수', '야간 조명 쇼', '지역 특산품 판매'],
    included: ['입장권', '축제장 셔틀버스', '포토존 이용'],
    excluded: ['식음료', '체험 프로그램', '주차비'],
    maxCapacity: 5000,
    featured: true,
    is_active: true
  },

  // 6. 체험
  {
    title: '소금밭 체험',
    category: '체험',
    category_id: 1862,
    price: 25000,
    childPrice: 17500,
    infantPrice: null,
    location: '신안군 증도면',
    detailedAddress: '전남 신안군 증도면 태평염전',
    meetingPoint: '태평염전 체험장',
    images: ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800'],
    description: '전통 천일염 생산 과정을 직접 체험',
    longDescription: '유네스코 생물권보전지역으로 지정된 증도의 태평염전에서 전통 방식의 소금 생산을 직접 체험할 수 있습니다. 염전 가이드 투어와 소금 긁기 체험이 포함됩니다.',
    highlights: ['전통 염전 체험', '소금 긁기 실습', '천일염 1kg 증정', '염전 포토존'],
    included: ['체험 프로그램', '가이드 투어', '천일염 1kg', '체험복 대여'],
    excluded: ['개인 교통편', '식사', '추가 구매 제품'],
    maxCapacity: 20,
    featured: false,
    is_active: true
  }
];

async function addProducts() {
  console.log('📦 6개 카테고리 상품 추가 시작...\n');

  for (const product of products) {
    try {
      const response = await fetch('http://localhost:3004/api/admin/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(product)
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ ${product.category} - ${product.title} 추가 완료 (ID: ${result.data.id})`);
      } else {
        console.error(`❌ ${product.category} - ${product.title} 실패:`, result.message || result.error);
      }
    } catch (error) {
      console.error(`❌ ${product.category} - ${product.title} 오류:`, error);
    }
  }

  console.log('\n🎉 작업 완료!');
}

addProducts();
