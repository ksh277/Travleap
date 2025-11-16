const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkPopupProducts() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== 팝업 상품 완전 분석 ===\n');

  try {
    // 팝업 카테고리 ID 확인
    const categoryResult = await connection.execute(`
      SELECT id, name_ko, slug FROM categories WHERE slug = 'popup'
    `);

    if (!categoryResult.rows || categoryResult.rows.length === 0) {
      console.error('❌ 팝업 카테고리를 찾을 수 없습니다!');
      return;
    }

    const popupCategoryId = categoryResult.rows[0].id;
    console.log(`✅ 팝업 카테고리 ID: ${popupCategoryId} (${categoryResult.rows[0].name_ko})\n`);

    // 팝업 상품 3개 상세 조회
    const productsResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        l.category_id,
        c.slug as category_slug,
        c.name_ko as category_name,
        l.price_from,
        l.short_description,
        l.location,
        l.address,
        l.has_options,
        l.min_purchase,
        l.max_purchase,
        l.stock_enabled,
        l.stock,
        l.shipping_fee,
        l.is_published,
        l.is_active
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE c.slug = 'popup'
      ORDER BY l.id
    `);

    console.log(`📦 팝업 상품 개수: ${productsResult.rows.length}개\n`);

    productsResult.rows.forEach((product, index) => {
      console.log(`\n${index + 1}. [ID: ${product.id}] ${product.title}`);
      console.log(`   category_id: ${product.category_id}`);
      console.log(`   category_slug: ${product.category_slug}`);
      console.log(`   category_name: ${product.category_name}`);
      console.log(`   가격: ${Number(product.price_from).toLocaleString()}원`);
      console.log(`   설명: ${product.short_description || 'N/A'}`);
      console.log(`   위치: ${product.location || 'N/A'}`);
      console.log(`   주소: ${product.address || 'N/A'}`);
      console.log(`   옵션 사용: ${product.has_options ? 'YES' : 'NO'}`);
      console.log(`   최소 구매: ${product.min_purchase || 'N/A'}`);
      console.log(`   최대 구매: ${product.max_purchase || 'N/A'}`);
      console.log(`   재고 관리: ${product.stock_enabled ? 'YES' : 'NO'}`);
      console.log(`   재고 수량: ${product.stock || 'N/A'}`);
      console.log(`   배송비: ${product.shipping_fee ? Number(product.shipping_fee).toLocaleString() + '원' : 'N/A'}`);
      console.log(`   게시 상태: ${product.is_published ? '✅' : '❌'}`);
      console.log(`   활성 상태: ${product.is_active ? '✅' : '❌'}`);
    });

    // API로 조회했을 때 어떻게 보이는지 확인
    console.log('\n\n=== API 응답 시뮬레이션 ===\n');

    const apiSimResult = await connection.execute(`
      SELECT
        l.*,
        c.name_ko as category_name,
        c.slug as category_slug,
        (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = l.id AND r.is_hidden != 1) as actual_review_count,
        (SELECT AVG(r.rating) FROM reviews r WHERE r.listing_id = l.id AND r.is_hidden != 1) as actual_rating_avg
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE c.slug = 'popup'
      ORDER BY l.id
    `);

    apiSimResult.rows.forEach((item, index) => {
      const mappedItem = {
        id: item.id,
        title: item.title,
        category: item.category_slug,  // ✅ 이게 'popup'이어야 함!
        category_id: item.category_id,
        category_slug: item.category_slug,
        price_from: item.price_from,
        location: item.location,
        address: item.address
      };

      console.log(`\n${index + 1}. API 응답:`);
      console.log(JSON.stringify(mappedItem, null, 2));

      // isPopupProduct 시뮬레이션
      const isPopup1 = mappedItem.category_id === 1860; // 하드코딩 체크
      const isPopup2 = mappedItem.category === '팝업';
      const isPopup3 = mappedItem.category === 'popup';

      console.log(`\n   isPopupProduct 체크:`);
      console.log(`   - category_id === 1860: ${isPopup1}`);
      console.log(`   - category === '팝업': ${isPopup2}`);
      console.log(`   - category === 'popup': ${isPopup3}`);
      console.log(`   - 최종 결과: ${isPopup1 || isPopup2 || isPopup3 ? '✅ 팝업으로 인식' : '❌ 팝업 아님'}`);
    });

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  console.log('\n\n=== 분석 완료 ===\n');
}

checkPopupProducts();
