/**
 * 간단한 카테고리별 상품 생성
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

const products = [
  {
    category: '숙박',
    title: '제주 오션뷰 호텔 - 디럭스 더블룸',
    short_description: '제주 바다가 한눈에 보이는 프리미엄 객실',
    description: `# 제주 오션뷰 호텔

넓은 창문으로 제주 바다의 아름다운 전망을 감상할 수 있는 디럭스 더블룸입니다.

## 객실 시설
- 킹사이즈 베드
- 고급 침구류
- 레인 샤워기
- 오션뷰 발코니

## 호텔 시설
- WiFi 무료
- 주차 가능
- 조식 포함
- 수영장`,
    address: '제주특별자치도 제주시 애월읍 해안로 123',
    price_from: 150000,
    price_to: 200000,
    images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
    ]
  },
  {
    category: '음식점',
    title: '서울 한식당 - 프리미엄 한정식 코스',
    short_description: '전통 한식의 깊은 맛을 현대적으로 재해석',
    description: `# 서울 한식당

제철 식재료로 정성스럽게 준비한 12첩 한정식입니다.

## 메뉴 구성
- 전통 한정식 12첩
- 제철 식재료 사용
- 정성스러운 플레이팅

## 특징
- 프라이빗 룸 가능
- 주차 지원
- 예약 필수`,
    address: '서울특별시 강남구 테헤란로 123',
    price_from: 50000,
    price_to: 80000,
    images: [
      'https://images.unsplash.com/photo-1580867335191-cca04e0d54c6?w=800',
      'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=800'
    ]
  },
  {
    category: '관광지',
    title: '경복궁 가이드 투어',
    short_description: '전문 문화해설사와 함께하는 경복궁 투어',
    description: `# 경복궁 가이드 투어

조선시대 정궁인 경복궁의 역사와 문화를 깊이 있게 체험하실 수 있습니다.

## 투어 코스
- 근정전
- 경회루
- 향원정
- 국립민속박물관

## 포함사항
- 전문 문화해설사
- 입장권
- 가이드북`,
    address: '서울특별시 종로구 사직로 161',
    price_from: 30000,
    price_to: 50000,
    images: [
      'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
      'https://images.unsplash.com/photo-1578193661809-a654e09d9f2e?w=800'
    ]
  },
  {
    category: '이벤트',
    title: '서울 재즈 페스티벌 2025',
    short_description: '세계적인 재즈 아티스트들과 함께하는 음악 축제',
    description: `# 서울 재즈 페스티벌

3일간 진행되는 대규모 재즈 페스티벌입니다.

## 주요 아티스트
- 국내외 유명 재즈 뮤지션
- 다양한 재즈 장르

## 편의시설
- 푸드존
- 주차장
- 다중 무대`,
    address: '서울특별시 마포구 상암동 월드컵공원',
    price_from: 80000,
    price_to: 150000,
    images: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'
    ]
  },
  {
    category: '체험',
    title: '한옥마을 전통문화 체험 패키지',
    short_description: '한복, 전통 차, 한지 공예를 포함한 3시간 코스',
    description: `# 한옥마을 전통문화 체험

전주 한옥마을에서 즐기는 전통문화 체험입니다.

## 체험 프로그램
- 한복 입기 체험
- 전통 차 시음
- 한지 공예 만들기

## 포함사항
- 한복 대여
- 전문 강사 설명
- 사진 촬영 서비스`,
    address: '전라북도 전주시 완산구 은행로 123',
    price_from: 45000,
    price_to: 65000,
    images: [
      'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800'
    ]
  }
];

async function createProducts() {
  console.log('🚀 카테고리별 상품 생성 시작...\n');

  const createdIds = {};

  for (const product of products) {
    try {
      console.log(`📍 ${product.category} - ${product.title}`);

      // listings 테이블에 직접 삽입 (올바른 컬럼 사용)
      const result = await connection.execute(`
        INSERT INTO listings (
          title, category, description_md, short_description,
          address, price_from, price_to,
          images, is_active, cart_enabled,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
      `, [
        product.title,
        product.category,
        product.description,
        product.short_description,
        product.address,
        product.price_from,
        product.price_to,
        JSON.stringify(product.images)
      ]);

      const listingId = result.insertId;
      createdIds[product.category] = listingId;

      console.log(`✅ 생성 완료 (ID: ${listingId})\n`);

    } catch (error) {
      console.error(`❌ ${product.category} 생성 실패:`, error.message);
    }
  }

  // 결과 요약
  console.log('\n✅ 전체 상품 생성 완료!');
  console.log('\n📊 생성된 상품:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const [category, id] of Object.entries(createdIds)) {
    let urlPath = '';
    if (category === '숙박') urlPath = 'hotel';
    else if (category === '음식점') urlPath = 'restaurant';
    else if (category === '관광지') urlPath = 'attraction';
    else if (category === '이벤트') urlPath = 'event';
    else if (category === '체험') urlPath = 'experience';

    console.log(`\n${category}:`);
    console.log(`  ID: ${id}`);
    console.log(`  URL: https://travelap.vercel.app/${urlPath}/${id}`);
  }

  console.log('\n');
}

createProducts()
  .then(() => {
    console.log('✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실패:', error);
    process.exit(1);
  });
