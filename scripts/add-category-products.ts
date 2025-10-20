#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function addCategoryProducts() {
  console.log('🛍️  Adding products for 6 categories...\n');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  // Category mapping: 여행=1855, 음식=1858, 관광지=1859, 팝업=1860, 행사=1861, 체험=1862
  const products = [
    {
      title: '신안 섬 호핑 투어',
      category_id: 1855, // 여행
      category: '여행',
      description: '1004개의 섬으로 이루어진 신안의 아름다운 섬들을 돌아보는 프리미엄 투어',
      short_description: '신안의 숨겨진 보석 같은 섬들을 탐험하는 1일 투어',
      price_from: 120000,
      child_price: 84000,
      infant_price: 36000,
      location: '전라남도 신안군',
      address: '전라남도 신안군 지도읍 선도리',
      max_capacity: 10,
      images: JSON.stringify(['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800']),
      highlights: JSON.stringify(['전문 가이드 동행', '점심 식사 포함', '기념품 제공']),
      included: JSON.stringify(['가이드 서비스', '점심 식사', '입장료', '보험']),
      excluded: JSON.stringify(['개인 용품', '추가 간식', '교통비']),
      partner_id: 153
    },
    {
      title: '신안 전통 해물 정식',
      category_id: 1858, // 음식
      category: '음식',
      description: '신안 앞바다에서 갓 잡아올린 싱싱한 해산물로 만든 전통 정식',
      short_description: '싱싱한 해산물로 만든 푸짐한 전통 정식',
      price_from: 35000,
      child_price: 25000,
      infant_price: 0,
      location: '전라남도 신안군',
      address: '전라남도 신안군 증도면 증도리 789',
      max_capacity: 50,
      images: JSON.stringify(['https://images.unsplash.com/photo-1703925155035-fd10b9c19b24?w=800']),
      highlights: JSON.stringify(['당일 잡은 신선한 해산물', '전통 조리법', '푸짐한 양']),
      included: JSON.stringify(['해물탕', '회', '구이', '반찬', '후식']),
      excluded: JSON.stringify(['음료', '추가 주류']),
      partner_id: 150
    },
    {
      title: '천사대교 전망대',
      category_id: 1859, // 관광지
      category: '관광지',
      description: '압해도와 암태도를 연결하는 아름다운 천사대교와 전망대',
      short_description: '서해를 한눈에 내려다보는 멋진 전망',
      price_from: 5000,
      child_price: 3000,
      infant_price: 0,
      location: '전라남도 신안군',
      address: '전라남도 신안군 암태면 천사대교',
      max_capacity: 100,
      images: JSON.stringify(['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800']),
      highlights: JSON.stringify(['360도 파노라마 뷰', '포토존', '일출/일몰 명소']),
      included: JSON.stringify(['입장료', '주차']),
      excluded: JSON.stringify(['음료', '간식']),
      partner_id: 150
    },
    {
      title: '신안 로컬마켓 팝업',
      category_id: 1860, // 팝업
      category: '팝업',
      description: '신안 지역 농수산물과 공예품을 만날 수 있는 주말 팝업 마켓',
      short_description: '신안의 특산물과 수공예품을 만나는 팝업스토어',
      price_from: 0,
      child_price: 0,
      infant_price: 0,
      location: '전라남도 신안군',
      address: '전라남도 신안군 지도읍 읍내리 광장',
      max_capacity: 200,
      images: JSON.stringify(['https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800']),
      highlights: JSON.stringify(['무료 입장', '지역 특산물', '수공예품', '푸드트럭']),
      included: JSON.stringify(['입장료 무료']),
      excluded: JSON.stringify(['구매 비용']),
      partner_id: 155
    },
    {
      title: '신안 갯벌축제 2025',
      category_id: 1861, // 행사
      category: '행사',
      description: '유네스코 세계유산 증도 갯벌에서 펼쳐지는 여름 축제',
      short_description: '갯벌 체험과 다양한 공연이 함께하는 여름 축제',
      price_from: 10000,
      child_price: 5000,
      infant_price: 0,
      location: '전라남도 신안군',
      address: '전라남도 신안군 증도면 증도리 해변',
      max_capacity: 1000,
      images: JSON.stringify(['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800']),
      highlights: JSON.stringify(['갯벌 체험', 'K-POP 공연', '불꽃놀이', '먹거리 부스']),
      included: JSON.stringify(['입장료', '갯벌 체험', '공연 관람']),
      excluded: JSON.stringify(['먹거리', '체험 부스 비용']),
      partner_id: 151
    },
    {
      title: '증도 염전 소금 만들기',
      category_id: 1862, // 체험
      category: '체험',
      description: '전통 천일염 생산 과정을 직접 체험하고 나만의 소금 만들기',
      short_description: '천일염 만들기와 염전 투어',
      price_from: 30000,
      child_price: 20000,
      infant_price: 10000,
      location: '전라남도 신안군',
      address: '전라남도 신안군 증도면 태평염전',
      max_capacity: 20,
      images: JSON.stringify(['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800']),
      highlights: JSON.stringify(['전통 염전 투어', '소금 만들기 체험', '천일염 1kg 증정']),
      included: JSON.stringify(['가이드 투어', '체험 재료', '천일염 기념품', '간식']),
      excluded: JSON.stringify(['개인 용품', '추가 구매']),
      partner_id: 151
    }
  ];

  try {
    for (const product of products) {
      const result = await connection.execute(
        `INSERT INTO listings (
          title, description_md, short_description, price_from, child_price, infant_price,
          location, address, category_id, category, max_capacity,
          images, highlights, included, excluded, partner_id,
          is_active, is_featured, is_published, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1, NOW(), NOW())`,
        [
          product.title,
          product.description,
          product.short_description,
          product.price_from,
          product.child_price,
          product.infant_price,
          product.location,
          product.address,
          product.category_id,
          product.category,
          product.max_capacity,
          product.images,
          product.highlights,
          product.included,
          product.excluded,
          product.partner_id
        ]
      );

      console.log(`✅ [${product.category}] ${product.title} (ID: ${result.insertId}) - ${product.price_from.toLocaleString()}원`);
    }

    console.log(`\n🎉 Successfully added ${products.length} products across 6 categories!`);
    console.log('\nCategories:');
    console.log('- 여행 (Travel)');
    console.log('- 음식 (Food)');
    console.log('- 관광지 (Attraction)');
    console.log('- 팝업 (Popup)');
    console.log('- 행사 (Event)');
    console.log('- 체험 (Experience)');
  } catch (error: any) {
    console.error('❌ Failed to create products:', error.message);
    process.exit(1);
  }
}

addCategoryProducts();
