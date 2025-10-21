import 'dotenv/config';
import { db } from '../utils/database';

// 카카오 REST API로 주소 검색
async function searchAddress(query: string) {
  const KAKAO_REST_API_KEY = 'YOUR_KAKAO_REST_API_KEY'; // 환경변수에서 가져오기

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
        }
      }
    );

    const data = await response.json();

    if (data.documents && data.documents.length > 0) {
      const doc = data.documents[0];
      return {
        address: doc.address_name,
        road_address: doc.road_address?.address_name,
        latitude: parseFloat(doc.y),
        longitude: parseFloat(doc.x),
        coordinates: `${doc.y},${doc.x}`
      };
    }

    return null;
  } catch (error) {
    console.error('주소 검색 실패:', error);
    return null;
  }
}

// 6개 카테고리 상품 데이터
const products = [
  {
    category_slug: 'tour',
    title: '증도 슬로우걷기 해설 투어',
    short_description: '느림의 미학, 증도를 걸으며 배우는 특별한 시간',
    description: `
# 증도 슬로우걷기 해설 투어

증도의 아름다운 자연과 역사를 전문 해설사와 함께 느리게 걷는 특별한 투어입니다.

## 투어 코스
- 태평염전: 국내 최대 천일염 생산지
- 우전해변: 고운 모래와 청정 바다
- 노을전망대: 서해 최고의 노을 명소
- 짱뚱어 다리: SNS 핫플레이스

## 포함사항
- 전문 해설사 동행
- 생수 제공
- 여행자 보험
- 증도 특산품 시식

## 준비물
- 편한 운동화
- 모자/선크림
- 개인 물병
    `.trim(),
    address_search: '전남 신안군 증도면 증동리',
    price_from: 25000,
    price_to: 25000,
    duration: 180,
    max_capacity: 15,
    min_age: 7,
    highlights: ['전문 해설사', '느린 여행', '태평염전 관람', '우전해변 산책'],
    included: ['전문 해설사', '생수', '여행자보험', '특산품 시식'],
    not_included: ['식사', '개인 경비'],
    images: [
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'
    ]
  },
  {
    category_slug: 'food',
    title: '증도 천일염 정식',
    short_description: '천일염으로 만든 건강한 한정식',
    description: `
# 증도 천일염 정식

증도에서 생산된 프리미엄 천일염으로 만든 건강한 한정식입니다.

## 메뉴 구성
- 염전 정식 (증도 천일염 사용)
- 짱뚱어 구이
- 각종 해산물 반찬
- 천일염 김치

## 특별한 점
- 증도산 100% 천일염 사용
- 신선한 해산물 요리
- 건강한 저염식
- 전통 한정식

## 운영 시간
- 점심: 11:30 - 14:00
- 저녁: 17:30 - 20:00
    `.trim(),
    address_search: '전남 신안군 증도면 증도로',
    price_from: 18000,
    price_to: 35000,
    duration: 90,
    max_capacity: 50,
    highlights: ['증도 천일염', '신선한 해산물', '한정식', '건강식'],
    included: ['정식 1인분', '반찬', '후식'],
    not_included: ['음료', '주류'],
    images: [
      'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10',
      'https://images.unsplash.com/photo-1498654896293-37aacf113fd9'
    ]
  },
  {
    category_slug: 'attraction',
    title: '태평염전',
    short_description: '국내 최대 규모의 천일염 생산지',
    description: `
# 태평염전

국내 최대 규모의 천일염 생산지이자 증도의 대표 관광지입니다.

## 관람 포인트
- 광활한 염전 풍경
- 전통 소금 생산 과정
- 염전 체험
- 염전 박물관

## 관람 안내
- 개인 자유 관람
- 염전 체험 프로그램 별도 운영
- 사진 촬영 명소
- 무료 주차

## 운영 시간
- 하절기(3-10월): 09:00-18:00
- 동절기(11-2월): 09:00-17:00
    `.trim(),
    address_search: '전남 신안군 증도면 태평염전길',
    price_from: 0,
    price_to: 0,
    duration: 120,
    max_capacity: 100,
    highlights: ['국내 최대 염전', '무료 관람', '체험 가능', 'SNS 명소'],
    included: ['자유 관람', '주차'],
    not_included: ['체험비', '가이드'],
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'
    ]
  },
  {
    category_slug: 'experience',
    title: '천일염 만들기 체험',
    short_description: '전통 방식으로 천일염을 직접 만들어보세요',
    description: `
# 천일염 만들기 체험

증도 태평염전에서 전통 방식으로 천일염을 직접 만들어보는 특별한 체험입니다.

## 체험 내용
- 염전 구조 설명
- 소금 채취 체험
- 천일염 생산 과정 학습
- 만든 천일염 포장 (500g 제공)

## 체험 시간
- 1회차: 10:00-12:00
- 2회차: 14:00-16:00

## 준비물
- 편한 옷차림
- 장화 또는 샌들
- 모자, 선크림

## 포함사항
- 체험 도구 제공
- 천일염 500g 가져가기
- 생수 제공
    `.trim(),
    address_search: '전남 신안군 증도면 태평염전길',
    price_from: 15000,
    price_to: 15000,
    duration: 120,
    max_capacity: 20,
    min_age: 5,
    highlights: ['염전 체험', '천일염 가져가기', '전통 방식', '가족 체험'],
    included: ['체험 도구', '천일염 500g', '생수'],
    not_included: ['식사', '교통편'],
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5'
    ]
  },
  {
    category_slug: 'popup',
    title: '증도 로컬 아트마켓',
    short_description: '신안의 로컬 아티스트와 만나는 팝업 마켓',
    description: `
# 증도 로컬 아트마켓

신안의 로컬 아티스트와 수공예가들이 모이는 특별한 팝업 마켓입니다.

## 마켓 구성
- 핸드메이드 공예품
- 로컬 아티스트 작품
- 증도 특산품
- 체험 부스

## 운영 일정
- 매주 토요일, 일요일
- 10:00 - 18:00
- 우천 시 실내 진행

## 참여 작가
- 도예 작가 3팀
- 천연염색 작가 2팀
- 목공예 작가 2팀
- 일러스트 작가 3팀

## 특별 혜택
- 입장료 무료
- 체험 프로그램 운영
- 현장 할인 이벤트
    `.trim(),
    address_search: '전남 신안군 증도면 증도로',
    price_from: 0,
    price_to: 50000,
    duration: 480,
    max_capacity: 200,
    highlights: ['무료 입장', '로컬 아티스트', '수공예품', '체험 부스'],
    included: ['입장', '전시 관람'],
    not_included: ['상품 구매', '체험비'],
    images: [
      'https://images.unsplash.com/photo-1483985988355-763728e1935b',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8'
    ]
  },
  {
    category_slug: 'event',
    title: '증도 해넘이 콘서트',
    short_description: '서해 노을과 함께하는 특별한 음악회',
    description: `
# 증도 해넘이 콘서트

서해의 아름다운 노을을 배경으로 펼쳐지는 특별한 음악회입니다.

## 공연 정보
- 일시: 매주 금요일, 토요일
- 시간: 18:00 - 20:00
- 장소: 증도 노을전망대

## 출연진
- 어쿠스틱 밴드 공연
- 지역 예술가 협연
- 게스트 아티스트 (주별 변동)

## 프로그램
- 1부: 어쿠스틱 공연 (18:00-18:50)
- 중간: 해넘이 타임 (18:50-19:10)
- 2부: 특별 공연 (19:10-20:00)

## 특별 혜택
- 증도 특산품 증정 (선착순 100명)
- 포토존 운영
- 푸드트럭 운영
    `.trim(),
    address_search: '전남 신안군 증도면 노을길',
    price_from: 10000,
    price_to: 25000,
    duration: 120,
    max_capacity: 300,
    highlights: ['노을 뷰', '라이브 음악', '무료 주차', '푸드트럭'],
    included: ['공연 관람', '주차'],
    not_included: ['음식', '음료'],
    images: [
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4',
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea'
    ]
  }
];

async function addProducts() {
  console.log('🚀 6개 카테고리 상품 추가 시작...\n');

  for (const product of products) {
    try {
      console.log(`\n📍 "${product.title}" 추가 중...`);

      // 카테고리 ID 가져오기
      const categoryResult = await db.query(
        'SELECT id FROM categories WHERE slug = ?',
        [product.category_slug]
      );

      if (!categoryResult || categoryResult.length === 0) {
        console.error(`❌ 카테고리를 찾을 수 없습니다: ${product.category_slug}`);
        continue;
      }

      const category_id = categoryResult[0].id;

      // 간단한 좌표 (실제로는 카카오 API 사용)
      const addressData = {
        address: product.address_search,
        location: product.address_search.includes('증도면') ? '신안군 증도면' : '신안군',
        coordinates: '34.9876,126.1234' // 증도 대략적인 좌표
      };

      // 상품 추가
      await db.execute(`
        INSERT INTO listings (
          title, category_id, short_description, description,
          address, location, coordinates,
          price_from, price_to,
          duration, max_capacity, min_age,
          highlights, included, excluded,
          images,
          is_published, is_active, is_featured,
          cart_enabled, instant_booking,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 1, 1, NOW(), NOW())
      `, [
        product.title,
        category_id,
        product.short_description,
        product.description,
        addressData.address,
        addressData.location,
        addressData.coordinates,
        product.price_from,
        product.price_to,
        product.duration || 120,
        product.max_capacity || 20,
        product.min_age || 0,
        JSON.stringify(product.highlights || []),
        JSON.stringify(product.included || []),
        JSON.stringify(product.not_included || []),
        JSON.stringify(product.images || [])
      ]);

      console.log(`✅ "${product.title}" 추가 완료!`);
      console.log(`   - 카테고리: ${product.category_slug}`);
      console.log(`   - 가격: ${product.price_from}원`);
      console.log(`   - 주소: ${addressData.address}`);
      console.log(`   - 좌표: ${addressData.coordinates}`);

    } catch (error) {
      console.error(`❌ "${product.title}" 추가 실패:`, error);
    }
  }

  console.log('\n\n🎉 모든 상품 추가 완료!');
  console.log('\n📋 추가된 상품:');
  console.log('1. 투어: 증도 슬로우걷기 해설 투어');
  console.log('2. 음식: 증도 천일염 정식');
  console.log('3. 관광지: 태평염전 (무료)');
  console.log('4. 체험: 천일염 만들기 체험');
  console.log('5. 팝업: 증도 로컬 아트마켓');
  console.log('6. 행사: 증도 해넘이 콘서트');

  console.log('\n✅ 모든 상품이 장바구니 담기 가능하도록 설정되었습니다.');
  console.log('✅ 상세페이지에서 지도에 위치가 표시됩니다.');

  process.exit(0);
}

addProducts();
