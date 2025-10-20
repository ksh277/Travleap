/**
 * 새 상품 추가 템플릿
 *
 * 이 템플릿을 복사해서 사용하면 자동으로 장바구니 기능이 활성화된 상품이 추가됩니다.
 *
 * 사용법:
 * 1. 이 파일을 복사해서 scripts/add-{product-name}.ts로 저장
 * 2. productData 부분만 수정
 * 3. npx tsx scripts/add-{product-name}.ts 실행
 */

import 'dotenv/config';
import { connect } from '@planetscale/database';

const db = connect({ url: process.env.DATABASE_URL! });

// 상품 데이터 정의 (여기만 수정하세요!)
const productsData = [
  {
    // 기본 정보
    title: '상품 제목',
    category_id: 1857, // 숙박:1857, 액티비티:1855, 렌트카:1858 등
    location: '신안군',
    address: '전라남도 신안군 상세 주소',

    // 가격 정보
    price_from: 80000,
    price_to: 220000,

    // 설명
    short_description: '짧은 설명 (1-2줄)',
    description_md: `
# 상세 설명

## 특징
- 특징 1
- 특징 2
- 특징 3

## 포함 사항
- 포함 항목 1
- 포함 항목 2
    `.trim(),

    // 이미지 (URL 배열)
    images: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ],

    // 편의시설/옵션
    amenities: [
      '무료 WiFi',
      '주차 가능',
      '조식 포함'
    ],

    // 하이라이트
    highlights: [
      '오션뷰',
      '최신 시설',
      '친절한 서비스'
    ],

    // 수용 인원
    max_capacity: 4,
    min_capacity: 1,

    // 태그
    tags: ['힐링', '가족여행', '커플'],

    // 파트너 ID (선택사항)
    partner_id: null,

    // ========== 장바구니 설정 (자동 활성화) ==========
    cart_enabled: true,           // 장바구니 담기 가능
    instant_booking: true,        // 즉시 예약 가능
    requires_approval: false,     // 승인 필요 없음
    booking_type: 'instant',      // 예약 방식: instant/inquiry/request
    cancellation_policy: 'flexible' // 취소 정책: flexible/moderate/strict
  }
];

async function addProducts() {
  try {
    console.log(`🛍️  ${productsData.length}개 상품 추가 중...\n`);

    for (const product of productsData) {
      console.log(`📝 "${product.title}" 추가 중...`);

      const result = await db.execute(`
        INSERT INTO listings (
          title, category_id, location, address,
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
          ?, ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?,
          ?, ?, ?,
          ?, ?,
          true, true,
          0, 0,
          NOW(), NOW()
        )
      `, [
        product.title,
        product.category_id,
        product.location,
        product.address,
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
        product.partner_id,
        product.cart_enabled,
        product.instant_booking,
        product.requires_approval,
        product.booking_type,
        product.cancellation_policy
      ]);

      console.log(`   ✅ ID: ${result.insertId} 추가 완료`);
      console.log(`   🛒 장바구니: ${product.cart_enabled ? '활성화' : '비활성화'}`);
      console.log(`   ⚡ 즉시 예약: ${product.instant_booking ? '가능' : '불가능'}\n`);
    }

    console.log('🎉 완료! 모든 상품이 장바구니 기능과 함께 추가되었습니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

addProducts();
