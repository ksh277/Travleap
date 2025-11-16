/**
 * 관광지 카테고리 상품 추가 스크립트
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function createTouristProduct() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n=== 관광지 상품 생성 ===\n');

    // 1. 관광지 카테고리 ID 조회
    const categoryResult = await connection.execute(`
      SELECT id, name_ko, slug FROM categories WHERE slug = 'tourist' LIMIT 1
    `);

    if (!categoryResult.rows || categoryResult.rows.length === 0) {
      console.error('❌ 관광지 카테고리를 찾을 수 없습니다.');
      return;
    }

    const categoryId = categoryResult.rows[0].id;
    console.log(`✅ 관광지 카테고리 ID: ${categoryId} (${categoryResult.rows[0].name_ko})`);

    // 2. 관광지 상품 추가
    const touristProduct = {
      category_id: categoryId,
      partner_id: null,  // 관리자가 직접 생성
      title: '증도 태평염전 소금박물관',
      description_md: `# 증도 태평염전 소금박물관

## 소개
유네스코 생물권보전지역인 증도에 위치한 태평염전은 국내 최대 규모의 천일염 생산지입니다.
소금박물관에서는 전통 천일염 제조 과정과 염전의 역사를 배울 수 있습니다.

## 주요 체험
- 소금 결정 만들기
- 염전 체험 (계절별 운영)
- 소금 족욕
- 전통 소금 창고 견학

## 관람 안내
- 연중무휴 (설날, 추석 당일 휴무)
- 오전 9시 - 오후 6시
- 주차장 완비`,
      short_description: '국내 최대 규모 천일염전과 소금의 모든 것을 배울 수 있는 박물관',
      price_from: 5000,  // 입장료
      currency: 'KRW',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800',
        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800'
      ]),
      location: '신안군 증도면',
      address: '전라남도 신안군 증도면 태평염전길 12',
      duration: '1-2시간',
      max_capacity: 100,
      min_capacity: 1,
      rating_avg: 4.5,
      rating_count: 127,
      is_published: 1,
      is_active: 1,
      featured_score: 0,
      amenities: JSON.stringify(['주차장', '화장실', '음료 자판기', '휠체어 접근 가능']),
      tags: JSON.stringify(['박물관', '체험', '가족', '교육', '증도']),
      highlights: JSON.stringify([
        '국내 최대 천일염전 견학',
        '소금 만들기 체험',
        '족욕 체험 가능',
        '유네스코 생물권보전지역'
      ]),
      included: JSON.stringify(['입장료', '기본 체험', '가이드 안내']),
      excluded: JSON.stringify(['추가 체험 비용', '개인 용품'])
    };

    const result = await connection.execute(`
      INSERT INTO listings (
        category_id, partner_id, title, description_md, short_description,
        price_from, currency, images, location, address, duration,
        max_capacity, min_capacity, rating_avg, rating_count,
        is_published, is_active, featured_score,
        amenities, tags, highlights, included, excluded,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        NOW(), NOW()
      )
    `, [
      touristProduct.category_id,
      touristProduct.partner_id,
      touristProduct.title,
      touristProduct.description_md,
      touristProduct.short_description,
      touristProduct.price_from,
      touristProduct.currency,
      touristProduct.images,
      touristProduct.location,
      touristProduct.address,
      touristProduct.duration,
      touristProduct.max_capacity,
      touristProduct.min_capacity,
      touristProduct.rating_avg,
      touristProduct.rating_count,
      touristProduct.is_published,
      touristProduct.is_active,
      touristProduct.featured_score,
      touristProduct.amenities,
      touristProduct.tags,
      touristProduct.highlights,
      touristProduct.included,
      touristProduct.excluded
    ]);

    const productId = result.insertId;
    console.log(`\n✅ 관광지 상품 생성 완료!`);
    console.log(`   ID: ${productId}`);
    console.log(`   제목: ${touristProduct.title}`);
    console.log(`   카테고리: 관광지 (tourist)`);
    console.log(`   가격: ${touristProduct.price_from.toLocaleString()}원`);
    console.log(`   위치: ${touristProduct.location}`);

    // 3. 생성된 상품 확인
    const verifyResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        l.price_from,
        c.name_ko as category_name,
        c.slug as category_slug
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      WHERE l.id = ?
    `, [productId]);

    if (verifyResult.rows && verifyResult.rows.length > 0) {
      const product = verifyResult.rows[0];
      console.log(`\n✅ 검증 완료:`);
      console.log(`   상품명: ${product.title}`);
      console.log(`   카테고리: ${product.category_name} (${product.category_slug})`);
      console.log(`   가격: ${product.price_from.toLocaleString()}원`);
      console.log(`\n🌐 상세 페이지: /listings/${productId}`);
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  console.log('\n=== 완료 ===\n');
}

createTouristProduct();
