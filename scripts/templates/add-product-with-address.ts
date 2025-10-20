/**
 * 주소 검색 기능이 포함된 상품 추가 템플릿
 *
 * 주소만 입력하면 카카오 API로 자동으로 좌표를 가져와서 저장
 */

import 'dotenv/config';
import { connect } from '@planetscale/database';
import { searchAddressSmart } from '../utils/kakao-address.js';

const db = connect({ url: process.env.DATABASE_URL! });

// ========== 여기만 수정하세요! ==========

const productsData = [
  {
    title: '신안 중도 월령 호텔',
    category_id: 1857, // 숙박

    // 주소: 간단한 위치 입력 (예: "신안군 증도면")
    // → 자동으로 정확한 주소와 좌표 검색됨
    location_search: '전라남도 신안군 증도면',

    // 상세 주소 (선택사항 - 검색된 주소에 추가할 상세 정보)
    address_detail: '중도 월령리 123',

    price_from: 80000,
    price_to: 220000,

    short_description: '오션뷰가 아름다운 프리미엄 리조트',
    description_md: `
# 신안 중도 월령 호텔

## 특징
- 바다 전망의 객실
- 수영장 및 스파 시설
- 레스토랑 및 카페

## 포함 사항
- 조식 뷔페
- 무료 주차
- WiFi 무료
    `.trim(),

    images: [
      'https://example.com/hotel1.jpg',
      'https://example.com/hotel2.jpg'
    ],

    amenities: ['무료 WiFi', '주차 가능', '조식 포함', '수영장', '스파'],
    highlights: ['오션뷰', '최신 시설', '친절한 서비스'],
    max_capacity: 4,
    min_capacity: 1,
    tags: ['힐링', '가족여행', '커플', '바다'],

    partner_id: null
  }
];

// ==========================================

async function addProductsWithAddress() {
  try {
    console.log('🏨 상품 추가 시작...\n');

    for (const product of productsData) {
      console.log(`📝 "${product.title}" 처리 중...\n`);

      // 1. 주소 검색
      console.log(`🔍 주소 검색: "${product.location_search}"`);

      const addressResults = await searchAddressSmart(product.location_search);

      if (addressResults.length === 0) {
        console.error(`   ❌ 주소를 찾을 수 없습니다: ${product.location_search}`);
        console.log(`   ⏭️  이 상품은 건너뜁니다.\n`);
        continue;
      }

      // 첫 번째 결과 사용
      const addressData = addressResults[0];

      console.log(`   ✅ 주소 발견:`);
      console.log(`      ${addressData.place_name || addressData.address}`);
      console.log(`      좌표: ${addressData.latitude}, ${addressData.longitude}\n`);

      // 2. 최종 주소 결정
      const finalAddress = product.address_detail
        ? `${addressData.address} ${product.address_detail}`
        : addressData.road_address || addressData.address;

      const coordinates = `${addressData.latitude},${addressData.longitude}`;

      // 3. DB에 저장
      console.log(`💾 데이터베이스에 저장 중...`);

      const result = await db.execute(`
        INSERT INTO listings (
          title, category_id, location, address, coordinates,
          price_from, price_to,
          short_description, description_md,
          images, amenities, highlights,
          max_capacity, min_capacity, tags,
          partner_id,
          cart_enabled, instant_booking, requires_approval,
          booking_type, cancellation_policy,
          is_active, is_published,
          rating_avg, rating_count,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?,
          true, true, false,
          'instant', 'flexible',
          true, true,
          0, 0,
          NOW(), NOW()
        )
      `, [
        product.title,
        product.category_id,
        product.location_search, // 간단 위치
        finalAddress,             // 상세 주소
        coordinates,              // 위도,경도
        product.price_from,
        product.price_to,
        product.short_description,
        product.description_md,
        JSON.stringify(product.images),
        JSON.stringify(product.amenities),
        JSON.stringify(product.highlights),
        product.max_capacity,
        product.min_capacity,
        JSON.stringify(product.tags),
        product.partner_id
      ]);

      console.log(`   ✅ 저장 완료! (ID: ${result.insertId})`);
      console.log(`   📍 위치: ${finalAddress}`);
      console.log(`   🗺️  좌표: ${coordinates}`);
      console.log(`   🛒 장바구니: 활성화`);
      console.log(`   ⚡ 즉시 예약: 가능\n`);
    }

    console.log('🎉 모든 상품이 추가되었습니다!');
    console.log('📍 주소와 좌표가 자동으로 저장되어 상세페이지 지도에 표시됩니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

addProductsWithAddress();
