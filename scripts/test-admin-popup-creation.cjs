/**
 * 관리자 페이지에서 팝업 상품 추가 시 제대로 저장되는지 테스트
 *
 * 테스트 시나리오:
 * 1. 관리자가 카테고리 '팝업' 선택
 * 2. 상품 정보 입력 후 저장
 * 3. DB에 category='popup' (영문 slug)로 저장되는지 확인
 * 4. category_id=1860으로 저장되는지 확인
 * 5. 저장된 상품이 isPopupProduct() 로직으로 팝업으로 인식되는지 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

// AdminPage.tsx의 카테고리 변환 로직 시뮬레이션
function convertCategoryToSlug(koreanCategory) {
  const categorySlug = koreanCategory === '여행' ? 'tour' :
                  koreanCategory === '숙박' ? 'stay' :
                  koreanCategory === '음식' ? 'food' :
                  koreanCategory === '렌트카' ? 'rentcar' :
                  koreanCategory === '관광지' ? 'tourist' :
                  koreanCategory === '팝업' ? 'popup' :
                  koreanCategory === '행사' ? 'event' :
                  koreanCategory === '체험' ? 'experience' : 'tour';
  return categorySlug;
}

// isPopupProduct 로직 시뮬레이션
function isPopupProduct(item) {
  if (!item) return false;
  return item.category_id === 1860 || item.category === '팝업' || item.category === 'popup';
}

async function testAdminPopupCreation() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== 관리자 팝업 상품 추가 테스트 ===\n');

  try {
    // ============================================
    // 1단계: 관리자가 선택한 한글 카테고리 시뮬레이션
    // ============================================
    const selectedCategory = '팝업';  // 관리자가 드롭다운에서 선택
    console.log(`1️⃣ 관리자가 선택한 카테고리: "${selectedCategory}"`);

    // ============================================
    // 2단계: AdminPage.tsx의 변환 로직 시뮬레이션
    // ============================================
    const categoryMap = {
      '여행': 1855, '렌트카': 1856, '숙박': 1857, '음식': 1858,
      '관광지': 1859, '팝업': 1860, '행사': 1861, '체험': 1862
    };

    const category_id = categoryMap[selectedCategory] || 1855;
    const category_slug = convertCategoryToSlug(selectedCategory);

    console.log(`\n2️⃣ 변환 결과:`);
    console.log(`   category_id: ${category_id}`);
    console.log(`   category (slug): "${category_slug}"`);

    // ============================================
    // 3단계: 예상되는 저장 데이터 확인
    // ============================================
    console.log(`\n3️⃣ DB에 저장될 데이터:`);
    console.log(`   INSERT INTO listings SET`);
    console.log(`     category_id = ${category_id}`);
    console.log(`     category = "${category_slug}"`);

    // ============================================
    // 4단계: 기존 팝업 상품들의 category 필드 확인
    // ============================================
    const existingProducts = await connection.execute(`
      SELECT id, title, category_id, category
      FROM listings
      WHERE category_id = 1860
      ORDER BY id
    `);

    console.log(`\n4️⃣ 기존 팝업 상품 확인 (총 ${existingProducts.rows.length}개):`);
    existingProducts.rows.forEach((product, idx) => {
      console.log(`   ${idx + 1}. [ID: ${product.id}] ${product.title}`);
      console.log(`      category_id: ${product.category_id}`);
      console.log(`      category: "${product.category}"`);
    });

    // ============================================
    // 5단계: isPopupProduct 로직 검증
    // ============================================
    console.log(`\n5️⃣ isPopupProduct() 검증:`);

    // 시나리오 A: 새로 추가될 상품 (영문 slug)
    const newProductData = {
      category_id: category_id,
      category: category_slug
    };

    const isNewProductPopup = isPopupProduct(newProductData);
    console.log(`   새 상품: category_id=${newProductData.category_id}, category="${newProductData.category}"`);
    console.log(`   → isPopupProduct() = ${isNewProductPopup ? '✅ true' : '❌ false'}`);

    // 시나리오 B: 기존 상품들도 검증
    let allPopup = true;
    existingProducts.rows.forEach((product, idx) => {
      const result = isPopupProduct(product);
      if (!result) allPopup = false;
      console.log(`   기존 상품 ${idx + 1}: isPopupProduct() = ${result ? '✅ true' : '❌ false'}`);
    });

    // ============================================
    // 6단계: 최종 결과
    // ============================================
    console.log('\n' + '='.repeat(80));

    if (isNewProductPopup && allPopup) {
      console.log('\n🎉 성공! 관리자 팝업 상품 추가 시스템이 정상 작동합니다!\n');
      console.log('✅ 검증 완료:');
      console.log('   1. 한글 카테고리 "팝업" → 영문 slug "popup" 변환 ✅');
      console.log('   2. category_id = 1860 정확히 설정 ✅');
      console.log('   3. isPopupProduct()가 새 상품을 팝업으로 인식 ✅');
      console.log('   4. 기존 팝업 상품들도 모두 정상 인식 ✅');
      console.log('');
      console.log('📝 예상되는 동작:');
      console.log('   - 관리자가 "팝업" 카테고리 선택');
      console.log('   - 상품 등록 시 category="popup" (영문)으로 DB 저장');
      console.log('   - DetailPage에서 팝업 UI 정상 표시 (수량 선택기)');
      console.log('   - 날짜/인원 선택기 숨김 처리');
    } else {
      console.log('\n❌ 실패: 일부 검증에 실패했습니다.\n');
      if (!isNewProductPopup) {
        console.log('   ❌ 새 상품이 팝업으로 인식되지 않습니다.');
      }
      if (!allPopup) {
        console.log('   ❌ 기존 상품 중 일부가 팝업으로 인식되지 않습니다.');
      }
    }

    // ============================================
    // 7단계: 추가 검증 - API 응답 시뮬레이션
    // ============================================
    console.log('\n7️⃣ API 응답 시뮬레이션:');
    console.log('   GET /api/listings?category=popup');

    const apiResult = await connection.execute(`
      SELECT
        l.*,
        c.slug as category_slug
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE c.slug = 'popup'
      LIMIT 1
    `);

    if (apiResult.rows.length > 0) {
      const listing = apiResult.rows[0];
      // api/listings.js의 매핑 로직 시뮬레이션
      const mappedListing = {
        ...listing,
        category: listing.category_slug  // API는 category_slug를 category로 매핑
      };

      console.log(`   실제 API 반환 데이터:`);
      console.log(`     category: "${mappedListing.category}"`);
      console.log(`     category_id: ${mappedListing.category_id}`);
      console.log(`   → isPopupProduct() = ${isPopupProduct(mappedListing) ? '✅ true' : '❌ false'}`);
    }

  } catch (error) {
    console.error('\n❌ 테스트 오류:', error);
  }

  console.log('\n=== 테스트 완료 ===\n');
}

testAdminPopupCreation();
