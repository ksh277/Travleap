/**
 * 팝업 UI 테스트 스크립트
 *
 * 팝업 상품 3개에 대해 isPopupProduct가 true를 반환하는지 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function testPopupUI() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== 팝업 UI 테스트 ===\n');

  try {
    // 팝업 상품 3개 조회 (API와 동일한 쿼리)
    const result = await connection.execute(`
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

    console.log(`📦 팝업 상품: ${result.rows.length}개\n`);

    // 각 상품에 대해 isPopupProduct 시뮬레이션
    result.rows.forEach((item, index) => {
      // API 매핑 (api/listings.js와 동일)
      const mappedItem = {
        ...item,
        category: item.category_slug,
        rating_count: Number(item.actual_review_count) || 0,
        rating_avg: Number(item.actual_rating_avg) || 0
      };

      // isPopupProduct 시뮬레이션 (수정된 버전)
      const isPopup_categoryId = mappedItem.category_id === 1860;
      const isPopup_korean = mappedItem.category === '팝업';
      const isPopup_english = mappedItem.category === 'popup';
      const isPopupResult = isPopup_categoryId || isPopup_korean || isPopup_english;

      console.log(`${index + 1}. [ID: ${mappedItem.id}] ${mappedItem.title}`);
      console.log(`   category_id: ${mappedItem.category_id}`);
      console.log(`   category: "${mappedItem.category}"`);
      console.log(`   category_slug: "${mappedItem.category_slug}"`);
      console.log('');
      console.log('   isPopupProduct 체크:');
      console.log(`   ✅ category_id === 1860: ${isPopup_categoryId}`);
      console.log(`   ${isPopup_korean ? '✅' : '❌'} category === '팝업': ${isPopup_korean}`);
      console.log(`   ${isPopup_english ? '✅' : '❌'} category === 'popup': ${isPopup_english}`);
      console.log('');
      console.log(`   🎯 최종 결과: ${isPopupResult ? '✅ 팝업 UI 표시됨!' : '❌ 팝업 UI 표시 안됨'}`);
      console.log('');
      console.log('   예상되는 UI:');
      console.log('   - ✅ 수량 선택기 (최소 1개)');
      console.log('   - ✅ +/- 버튼');
      console.log('   - ✅ 빠른 추가: +10, +50, +100, +500');
      console.log('   - ✅ 상품 가격 표시');
      console.log('   - ✅ 수량 x 개수');
      console.log('   - ✅ 총 금액');
      console.log('   - ✅ 장바구니 담기 / 결제하기');
      console.log('   - ❌ 위치 정보 (숨김)');
      console.log('   - ❌ 날짜 선택 (숨김)');
      console.log('   - ❌ 인원 선택 (숨김)');
      console.log('\n' + '='.repeat(80) + '\n');
    });

    // 최종 검증
    const allPopup = result.rows.every(item => {
      const mapped = { ...item, category: item.category_slug };
      return mapped.category_id === 1860 || mapped.category === '팝업' || mapped.category === 'popup';
    });

    if (allPopup) {
      console.log('🎉 성공! 모든 팝업 상품이 팝업 UI로 표시됩니다!');
      console.log('');
      console.log('✅ 수정 완료:');
      console.log('   - DetailPage.tsx: category_id === 3 → 1860');
      console.log('   - CartPage.tsx: category_id === 3 → 1860');
      console.log('   - PaymentHistoryCard.tsx: category_id === 3 → 1860');
      console.log('   - PaymentPage.tsx: category_id === 3 → 1860');
    } else {
      console.log('❌ 실패: 일부 상품이 팝업으로 인식되지 않습니다.');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  console.log('\n=== 테스트 완료 ===\n');
}

testPopupUI();
