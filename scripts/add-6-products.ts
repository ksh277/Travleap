import 'dotenv/config';
import { db } from '../utils/database';

async function add6Products() {
  console.log('📦 카테고리별 상품 6개 추가 시작...\n');

  const products = [
    // 1. 여행
    {
      title: '증도 노을투어',
      category: '여행',
      category_id: 1855,
      price_from: 45000,
      price_to: 45000,
      location: '신안군 증도면',
      address: '전남 신안군 증도면 태평염전길 12',
      meeting_point: '증도 선착장 매표소 앞',
      images: JSON.stringify(['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800']),
      short_description: '증도의 아름다운 노을을 감상하는 특별한 투어',
      description_md: '염전과 갯벌을 배경으로 펼쳐지는 환상적인 일몰 풍경을 감상할 수 있습니다. 전문 가이드와 함께하는 2시간 코스로 포토존에서의 사진 촬영 시간도 포함됩니다.',
      highlights: JSON.stringify(['전문 가이드 동행', '포토존 사진 촬영', '증도 노을 명소 투어']),
      included: JSON.stringify(['가이드 투어', '간식 제공', '기념 사진 촬영']),
      excluded: JSON.stringify(['개인 교통편', '식사']),
      max_capacity: 10,
      is_featured: 1,
      is_active: 1
    },

    // 2. 음식
    {
      title: '짱뚱어 정식',
      category: '음식',
      category_id: 1858,
      price_from: 18000,
      price_to: 18000,
      location: '신안군 압해읍',
      address: '전남 신안군 압해읍 송공항길 45',
      meeting_point: '짱뚱어마을 식당',
      images: JSON.stringify(['https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800']),
      short_description: '신안 특산물 짱뚱어로 만든 건강 정식',
      description_md: '신안의 청정 갯벌에서 잡은 싱싱한 짱뚱어를 다양한 방법으로 요리한 정식입니다. 짱뚱어탕, 짱뚱어튀김, 짱뚱어무침 등 다양한 메뉴가 포함됩니다.',
      highlights: JSON.stringify(['청정 갯벌 짱뚱어', '다양한 짱뚱어 요리', '영양 만점 건강식']),
      included: JSON.stringify(['짱뚱어탕', '짱뚱어튀김', '짱뚱어무침', '밥과 반찬']),
      excluded: JSON.stringify(['음료', '추가 주문 메뉴']),
      max_capacity: 50,
      is_featured: 0,
      is_active: 1
    },

    // 3. 관광지
    {
      title: '퍼플섬 입장권',
      category: '관광지',
      category_id: 1859,
      price_from: 5000,
      price_to: 5000,
      location: '신안군 안좌면',
      address: '전남 신안군 안좌면 반월·박지길',
      meeting_point: '퍼플섬 입구 매표소',
      images: JSON.stringify(['https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=800']),
      short_description: '보라색으로 물든 아름다운 퍼플섬 방문',
      description_md: '보라색 꽃과 보라색으로 칠해진 집들이 있는 독특한 테마 섬입니다. 천사대교를 건너 아름다운 풍경을 감상하며 산책할 수 있습니다.',
      highlights: JSON.stringify(['보라색 테마 포토존', '천사대교 전망', '갯벌 체험 가능']),
      included: JSON.stringify(['입장권', '안내 지도']),
      excluded: JSON.stringify(['체험 프로그램', '식사', '교통편']),
      max_capacity: 200,
      is_featured: 1,
      is_active: 1
    },

    // 4. 팝업
    {
      title: '신안 소금 팝업스토어',
      category: '팝업',
      category_id: 1860,
      price_from: 0,
      price_to: 0,
      location: '신안군 증도면',
      address: '전남 신안군 증도면 태평염전길 15',
      meeting_point: '증도 소금박물관 앞',
      images: JSON.stringify(['https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800']),
      short_description: '신안 천일염과 소금 제품을 만나는 팝업스토어',
      description_md: '신안의 명품 천일염과 다양한 소금 가공품을 판매하는 기간 한정 팝업스토어입니다. 소금 체험 프로그램도 함께 운영됩니다.',
      highlights: JSON.stringify(['신안 천일염 판매', '소금 체험 프로그램', '한정 기념품']),
      included: JSON.stringify(['무료 입장', '시식 제공']),
      excluded: JSON.stringify(['제품 구매비', '체험 프로그램비']),
      max_capacity: 100,
      is_featured: 0,
      is_active: 1
    },

    // 5. 행사
    {
      title: '신안 튤립축제 2025',
      category: '행사',
      category_id: 1861,
      price_from: 10000,
      price_to: 10000,
      location: '신안군 지도읍',
      address: '전남 신안군 지도읍 읍내리 튤립단지',
      meeting_point: '튤립축제 메인 입구',
      images: JSON.stringify(['https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800']),
      short_description: '100만 송이 튤립이 피어나는 봄 축제',
      description_md: '매년 봄 신안에서 개최되는 국내 최대 규모의 튤립 축제입니다. 100만 송이가 넘는 다양한 색상의 튤립이 장관을 이룹니다.',
      highlights: JSON.stringify(['100만 송이 튤립', '포토존 다수', '야간 조명 쇼', '지역 특산품 판매']),
      included: JSON.stringify(['입장권', '축제장 셔틀버스', '포토존 이용']),
      excluded: JSON.stringify(['식음료', '체험 프로그램', '주차비']),
      max_capacity: 5000,
      is_featured: 1,
      is_active: 1
    },

    // 6. 체험
    {
      title: '소금밭 체험',
      category: '체험',
      category_id: 1862,
      price_from: 25000,
      price_to: 25000,
      location: '신안군 증도면',
      address: '전남 신안군 증도면 태평염전',
      meeting_point: '태평염전 체험장',
      images: JSON.stringify(['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800']),
      short_description: '전통 천일염 생산 과정을 직접 체험',
      description_md: '유네스코 생물권보전지역으로 지정된 증도의 태평염전에서 전통 방식의 소금 생산을 직접 체험할 수 있습니다. 염전 가이드 투어와 소금 긁기 체험이 포함됩니다.',
      highlights: JSON.stringify(['전통 염전 체험', '소금 긁기 실습', '천일염 1kg 증정', '염전 포토존']),
      included: JSON.stringify(['체험 프로그램', '가이드 투어', '천일염 1kg', '체험복 대여']),
      excluded: JSON.stringify(['개인 교통편', '식사', '추가 구매 제품']),
      max_capacity: 20,
      is_featured: 0,
      is_active: 1
    }
  ];

  try {
    for (const product of products) {
      const result = await db.execute(
        `INSERT INTO listings
        (title, category, category_id, price_from, price_to, location, address,
         meeting_point, images, short_description, description_md, highlights, included, excluded,
         max_capacity, is_featured, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          product.title,
          product.category,
          product.category_id,
          product.price_from,
          product.price_to,
          product.location,
          product.address,
          product.meeting_point,
          product.images,
          product.short_description,
          product.description_md,
          product.highlights,
          product.included,
          product.excluded,
          product.max_capacity,
          product.is_featured,
          product.is_active
        ]
      );

      console.log(`✅ ${product.category} - ${product.title} 추가 완료`);
    }

    console.log('\n✅ 총 6개 상품 추가 완료!');
  } catch (error) {
    console.error('❌ 상품 추가 실패:', error);
    throw error;
  }
}

// 실행
add6Products()
  .then(() => {
    console.log('\n🎉 작업 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
