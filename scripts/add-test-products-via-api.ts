#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function addTestProducts() {
  console.log('🛍️  카테고리별 테스트 상품 추가 중...\n');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  // AdminPage 양식과 동일한 필드 구조
  const products = [
    {
      title: '[테스트] 신안 청정 섬 투어',
      description: '신안의 아름다운 섬들을 둘러보는 당일 투어',
      longDescription: '1004개의 섬으로 이루어진 신안의 청정 섬들을 전문 가이드와 함께 둘러보는 프리미엄 투어입니다. 천혜의 자연경관과 함께 신안의 역사와 문화를 체험할 수 있습니다.',
      price: 150000,
      childPrice: 100000,
      infantPrice: 50000,
      location: '전라남도 신안군',
      address: '전라남도 신안군 지도읍 선도리 123',
      meetingPoint: '신안군 관광안내소 앞',
      category_id: 1855,
      category: '여행',
      maxCapacity: 15,
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
      highlights: ['전문 가이드 동행', '점심 도시락 제공', '기념품 증정', '보험 포함'],
      included: ['왕복 교통편', '가이드 서비스', '점심 식사', '입장료', '여행자 보험'],
      excluded: ['개인 용품', '추가 간식', '저녁 식사', '개인 교통비']
    },
    {
      title: '[테스트] 신안 해산물 뷔페',
      description: '신선한 해산물로 즐기는 무한 뷔페',
      longDescription: '신안 앞바다에서 당일 잡아올린 싱싱한 해산물을 무한으로 즐길 수 있는 뷔페입니다. 전복, 굴, 새우, 게 등 다양한 해산물을 신선하게 즐기실 수 있습니다.',
      price: 45000,
      childPrice: 30000,
      infantPrice: 0,
      location: '전라남도 신안군',
      address: '전라남도 신안군 증도면 증도리 456',
      meetingPoint: '레스토랑 주차장',
      category_id: 1858,
      category: '음식',
      maxCapacity: 80,
      images: ['https://images.unsplash.com/photo-1703925155035-fd10b9c19b24?w=800'],
      highlights: ['당일 잡은 신선한 해산물', '무한 리필', '주차 무료', '단체 예약 할인'],
      included: ['뷔페 식사', '기본 음료', '주차', '웰컴 티'],
      excluded: ['주류', '특수 음료', '추가 메뉴']
    },
    {
      title: '[테스트] 천사대교 스카이워크',
      description: '하늘을 걷는 듯한 전망대 체험',
      longDescription: '천사대교 중간에 위치한 유리 바닥 스카이워크에서 서해바다를 발아래 두고 걷는 스릴 넘치는 체험을 할 수 있습니다. 360도 파노라마 뷰와 함께 멋진 사진을 남기세요.',
      price: 8000,
      childPrice: 5000,
      infantPrice: 0,
      location: '전라남도 신안군',
      address: '전라남도 신안군 암태면 천사대교',
      meetingPoint: '천사대교 전망대 입구',
      category_id: 1859,
      category: '관광지',
      maxCapacity: 150,
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
      highlights: ['유리 바닥 스카이워크', '360도 전망', '포토존 다수', '일출/일몰 명소'],
      included: ['입장료', '안전 장비', '주차'],
      excluded: ['사진 인화', '음료', '간식']
    },
    {
      title: '[테스트] 신안 아트마켓',
      description: '지역 예술가들의 작품을 만나는 팝업',
      longDescription: '신안 지역 예술가들과 공예가들이 직접 만든 작품을 전시하고 판매하는 주말 팝업 마켓입니다. 도예, 회화, 수공예품, 로컬푸드 등을 만날 수 있습니다.',
      price: 0,
      childPrice: 0,
      infantPrice: 0,
      location: '전라남도 신안군',
      address: '전라남도 신안군 지도읍 문화광장',
      meetingPoint: '문화광장 중앙',
      category_id: 1860,
      category: '팝업',
      maxCapacity: 300,
      images: ['https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800'],
      highlights: ['무료 입장', '지역 예술가 작품', '체험 부스', '로컬 푸드 판매'],
      included: ['입장료 무료', '주차', '체험 부스 이용'],
      excluded: ['작품 구매 비용', '음식 구매 비용']
    },
    {
      title: '[테스트] 신안 갯벌 음악축제',
      description: '갯벌에서 즐기는 여름 음악 페스티벌',
      longDescription: '유네스코 세계유산 증도 갯벌에서 펼쳐지는 대규모 음악 축제입니다. K-POP 아티스트 공연, 갯벌 체험, 불꽃놀이 등 다채로운 프로그램이 준비되어 있습니다.',
      price: 25000,
      childPrice: 15000,
      infantPrice: 0,
      location: '전라남도 신안군',
      address: '전라남도 신안군 증도면 증도리 해변',
      meetingPoint: '증도 해변 메인 스테이지',
      category_id: 1861,
      category: '행사',
      maxCapacity: 2000,
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
      highlights: ['K-POP 공연', '갯벌 체험', '불꽃놀이', '먹거리 부스', '포토존'],
      included: ['입장료', '갯벌 체험', '공연 관람', '기본 이벤트 참여'],
      excluded: ['먹거리', '음료', '유료 체험 부스', 'VIP 좌석']
    },
    {
      title: '[테스트] 천일염 만들기 체험',
      description: '전통 방식으로 천일염을 만드는 체험',
      longDescription: '증도 태평염전에서 전통 천일염 생산 과정을 직접 체험하고 나만의 소금을 만들어보세요. 염전 투어와 함께 천일염의 역사와 제조 과정을 배울 수 있습니다.',
      price: 35000,
      childPrice: 25000,
      infantPrice: 15000,
      location: '전라남도 신안군',
      address: '전라남도 신안군 증도면 태평염전',
      meetingPoint: '태평염전 방문자센터',
      category_id: 1862,
      category: '체험',
      maxCapacity: 25,
      images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800'],
      highlights: ['염전 투어', '천일염 만들기', '소금 1kg 증정', '간식 제공', '전문 가이드'],
      included: ['가이드 투어', '체험 재료', '천일염 1kg', '간식', '음료'],
      excluded: ['개인 용품', '추가 소금 구매', '교통비']
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
          null, // partner_id
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
      console.log(`   ID: ${result.insertId} | 가격: ${product.price.toLocaleString()}원 | 정원: ${product.maxCapacity}명`);
      console.log(`   포함: ${product.included.length}개 항목 | 불포함: ${product.excluded.length}개 항목\n`);
    }

    console.log(`\n🎉 총 ${products.length}개 테스트 상품 추가 완료!`);
    console.log('\n추가된 카테고리:');
    console.log('✓ 여행 (1855)');
    console.log('✓ 음식 (1858)');
    console.log('✓ 관광지 (1859)');
    console.log('✓ 팝업 (1860)');
    console.log('✓ 행사 (1861)');
    console.log('✓ 체험 (1862)');
  } catch (error: any) {
    console.error('❌ 상품 추가 실패:', error.message);
    process.exit(1);
  }
}

addTestProducts();
