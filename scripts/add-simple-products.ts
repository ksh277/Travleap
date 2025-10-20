#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function addSimpleProducts() {
  console.log('🛍️  양식대로 카테고리별 상품 추가 중...\n');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  // 간단한 상품 데이터 (AdminPage 양식의 필수 필드만)
  const products = [
    {
      title: '신안 해안 트레킹',
      category_id: 1855,
      category: '여행',
      description: '아름다운 신안 해안선을 따라 걷는 트레킹 코스',
      longDescription: '신안의 청정 해안선을 따라 걷는 힐링 트레킹입니다. 전문 가이드와 함께 숨겨진 비경을 발견하고 자연과 함께하는 시간을 보내세요.',
      price: 50000,
      childPrice: 35000,
      infantPrice: 0,
      location: '신안군',
      address: '전라남도 신안군 도초면 해안로',
      meetingPoint: '도초면 관광안내소',
      maxCapacity: 15,
      images: ['https://images.unsplash.com/photo-1551632811-561732d1e306?w=800'],
      highlights: ['전문 가이드', '간식 포함', '사진 촬영'],
      included: ['가이드', '간식', '보험'],
      excluded: ['식사', '개인 용품'],
      partner_id: 153
    },
    {
      title: '신안 전통 염전 정식',
      category_id: 1858,
      category: '음식',
      description: '천일염으로 만든 신안 전통 음식',
      longDescription: '증도 태평염전에서 만든 천일염으로 조리한 전통 정식입니다. 건강한 재료로 정성껏 만든 음식을 맛보세요.',
      price: 25000,
      childPrice: 18000,
      infantPrice: 0,
      location: '신안군',
      address: '전라남도 신안군 증도면 태평리',
      meetingPoint: '태평염전 식당',
      maxCapacity: 40,
      images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'],
      highlights: ['천일염 사용', '제철 재료', '정갈한 상차림'],
      included: ['정식', '반찬', '후식'],
      excluded: ['주류', '추가 메뉴'],
      partner_id: 150
    },
    {
      title: '비금도 하누넘해수욕장',
      category_id: 1859,
      category: '관광지',
      description: '국내 최고의 모래해변',
      longDescription: '비금도의 유명한 하누넘해수욕장입니다. 넓은 백사장과 맑은 바닷물이 일품인 신안의 대표 해수욕장입니다.',
      price: 0,
      childPrice: 0,
      infantPrice: 0,
      location: '신안군',
      address: '전라남도 신안군 비금면 하누넘길',
      meetingPoint: '하누넘해수욕장 주차장',
      maxCapacity: 500,
      images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'],
      highlights: ['무료 입장', '넓은 백사장', '주차 편의'],
      included: ['입장', '주차'],
      excluded: ['물품 대여', '음식'],
      partner_id: 150
    },
    {
      title: '신안 로컬 크리에이터 마켓',
      category_id: 1860,
      category: '팝업',
      description: '지역 작가들의 수공예품 팝업',
      longDescription: '신안 지역 크리에이터들의 수공예품과 로컬 상품을 만날 수 있는 팝업 마켓입니다. 매주 토요일 운영됩니다.',
      price: 0,
      childPrice: 0,
      infantPrice: 0,
      location: '신안군',
      address: '전라남도 신안군 지도읍 문화로',
      meetingPoint: '지도읍 문화센터',
      maxCapacity: 200,
      images: ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800'],
      highlights: ['무료 입장', '수공예품', '로컬 푸드'],
      included: ['입장'],
      excluded: ['구매 비용'],
      partner_id: 155
    },
    {
      title: '신안 바다 음악회',
      category_id: 1861,
      category: '행사',
      description: '바닷가에서 즐기는 클래식 음악회',
      longDescription: '아름다운 석양을 배경으로 펼쳐지는 클래식 음악회입니다. 자연과 음악이 어우러진 특별한 경험을 선사합니다.',
      price: 20000,
      childPrice: 10000,
      infantPrice: 0,
      location: '신안군',
      address: '전라남도 신안군 증도면 해변공원',
      meetingPoint: '증도 해변공원 무대',
      maxCapacity: 300,
      images: ['https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'],
      highlights: ['클래식 공연', '석양 감상', '야외 무대'],
      included: ['공연 관람', '좌석'],
      excluded: ['음료', '주차'],
      partner_id: 151
    },
    {
      title: '신안 갯벌 생태 체험',
      category_id: 1862,
      category: '체험',
      description: '유네스코 세계유산 갯벌 체험',
      longDescription: '유네스코 세계유산으로 등재된 신안 갯벌에서 조개잡이와 게잡이 체험을 할 수 있습니다. 가족 단위 체험에 최적화되어 있습니다.',
      price: 40000,
      childPrice: 30000,
      infantPrice: 20000,
      location: '신안군',
      address: '전라남도 신안군 증도면 갯벌체험장',
      meetingPoint: '증도 갯벌체험장 입구',
      maxCapacity: 30,
      images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800'],
      highlights: ['전문 가이드', '체험 도구 제공', '수확물 증정'],
      included: ['가이드', '도구', '간식'],
      excluded: ['식사', '교통'],
      partner_id: 151
    }
  ];

  try {
    for (const product of products) {
      const result = await connection.execute(
        `INSERT INTO listings (
          title, description_md, short_description, price_from, child_price, infant_price,
          location, address, meeting_point, category_id, category, partner_id,
          images, max_capacity, highlights, included, excluded,
          is_active, is_featured, is_published, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          product.title,
          product.longDescription,
          product.description,
          product.price,
          product.childPrice,
          product.infantPrice,
          product.location,
          product.address,
          product.meetingPoint,
          product.category_id,
          product.category,
          product.partner_id,
          JSON.stringify(product.images),
          product.maxCapacity,
          JSON.stringify(product.highlights),
          JSON.stringify(product.included),
          JSON.stringify(product.excluded),
          1, // is_active
          0, // is_featured
          1  // is_published
        ]
      );

      console.log(`✅ [${product.category}] ${product.title}`);
      console.log(`   ID: ${result.insertId} | 가격: ${product.price.toLocaleString()}원 | 정원: ${product.maxCapacity}명\n`);
    }

    console.log(`\n🎉 총 ${products.length}개 카테고리별 상품 추가 완료!`);
    console.log('\n추가된 카테고리:');
    console.log('✓ 여행 (1855): 신안 해안 트레킹');
    console.log('✓ 음식 (1858): 신안 전통 염전 정식');
    console.log('✓ 관광지 (1859): 비금도 하누넘해수욕장');
    console.log('✓ 팝업 (1860): 신안 로컬 크리에이터 마켓');
    console.log('✓ 행사 (1861): 신안 바다 음악회');
    console.log('✓ 체험 (1862): 신안 갯벌 생태 체험');
  } catch (error: any) {
    console.error('❌ 상품 추가 실패:', error.message);
    process.exit(1);
  }
}

addSimpleProducts();
