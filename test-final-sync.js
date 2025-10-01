// 최종 완전 동기화 테스트 스크립트
async function testFinalSync() {
  console.log('🎯 === 최종 완전 동기화 테스트 시작 ===');

  try {
    // 1. 관리자 페이지 상품 확인
    console.log('\n1️⃣ 관리자 페이지 상품 확인...');
    const adminResponse = await fetch('/api/admin/listings?limit=100');
    const adminResult = await adminResponse.json();
    const adminProducts = adminResult.data || [];
    console.log(`🔧 관리자 페이지: ${adminProducts.length}개 상품`);

    adminProducts.forEach((product, idx) => {
      console.log(`   ${idx+1}. ${product.title} (카테고리: ${product.category})`);
    });

    // 2. 전체 API 상품 확인
    console.log('\n2️⃣ 전체 API 상품 확인...');
    const allResponse = await fetch('/api/listings?limit=100');
    const allResult = await allResponse.json();
    const allProducts = allResult.data || [];
    console.log(`📄 전체 API: ${allProducts.length}개 상품`);

    // 3. 카테고리별 상품 확인
    console.log('\n3️⃣ 카테고리별 상품 확인...');
    const categories = [
      { slug: 'tour', name: '여행' },
      { slug: 'stay', name: '숙박' },
      { slug: 'food', name: '음식' },
      { slug: 'rentcar', name: '렌트카' },
      { slug: 'tourist', name: '관광지' },
      { slug: 'popup', name: '팝업' },
      { slug: 'event', name: '행사' },
      { slug: 'experience', name: '체험' }
    ];

    let totalCategoryProducts = 0;
    for (const cat of categories) {
      const catResponse = await fetch(`/api/listings?category=${cat.slug}&limit=100`);
      const catResult = await catResponse.json();
      const catProducts = catResult.data || [];
      console.log(`   📂 ${cat.name} (${cat.slug}): ${catProducts.length}개`);
      totalCategoryProducts += catProducts.length;

      if (catProducts.length > 0) {
        catProducts.forEach((product, idx) => {
          console.log(`      ${idx+1}. ${product.title}`);
        });
      }
    }

    // 4. 메인 페이지 API 확인
    console.log('\n4️⃣ 메인 페이지 API 확인...');
    const homeResponse = await fetch('/api/listings?limit=8&sortBy=popular');
    const homeResult = await homeResponse.json();
    const homeProducts = homeResult.data || [];
    console.log(`🏠 메인 페이지: ${homeProducts.length}개 상품`);

    // 5. 결과 분석
    console.log('\n🔍 === 결과 분석 ===');
    console.log(`관리자: ${adminProducts.length}개`);
    console.log(`전체 API: ${allProducts.length}개`);
    console.log(`메인페이지: ${homeProducts.length}개`);
    console.log(`카테고리 총합: ${totalCategoryProducts}개`);

    // 6. 동기화 상태 확인
    if (adminProducts.length === allProducts.length &&
        adminProducts.length === homeProducts.length) {
      console.log('✅ 완벽한 동기화 성공!');

      // 각 카테고리에 상품이 있는지 확인
      let hasAllCategories = true;
      for (const cat of categories) {
        const catResponse = await fetch(`/api/listings?category=${cat.slug}`);
        const catResult = await catResponse.json();
        const catProducts = catResult.data || [];

        // 해당 카테고리 상품이 관리자 페이지에 있는지 확인
        const adminCatProducts = adminProducts.filter(p => p.category === cat.name);
        if (adminCatProducts.length !== catProducts.length) {
          console.log(`❌ ${cat.name} 카테고리 불일치: 관리자 ${adminCatProducts.length}개, API ${catProducts.length}개`);
          hasAllCategories = false;
        }
      }

      if (hasAllCategories) {
        console.log('🎉 모든 카테고리 완벽 동기화 성공!');
      } else {
        console.log('⚠️ 일부 카테고리에서 동기화 문제 발견');
      }

    } else {
      console.log('❌ 동기화 실패 - 개수 불일치');
      console.log('자동 수정 시도 중...');
      await fixSyncIssues();
    }

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error);
  }
}

async function fixSyncIssues() {
  console.log('🔧 동기화 문제 자동 수정 중...');

  try {
    // 관리자 API로 모든 상품을 다시 로드하여 동기화
    const response = await fetch('/api/admin/sync-all-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_all' })
    });

    if (response.ok) {
      console.log('✅ 동기화 수정 완료');
      setTimeout(() => {
        console.log('\n🔄 수정 후 재테스트...');
        testFinalSync();
      }, 2000);
    } else {
      console.log('❌ 동기화 수정 실패');
    }
  } catch (error) {
    console.error('❌ 수정 중 오류:', error);
  }
}

// 관리자 페이지 모든 기능 테스트
async function testAdminFeatures() {
  console.log('\n🛠️ === 관리자 페이지 기능 테스트 ===');

  const features = [
    { name: '상품 관리', endpoint: '/api/admin/listings' },
    { name: '리뷰 관리', endpoint: '/api/admin/reviews' },
    { name: '파트너 관리', endpoint: '/api/admin/partners' },
    { name: '주문 관리', endpoint: '/api/admin/orders' },
    { name: '사용자 관리', endpoint: '/api/admin/users' },
    { name: '이미지 관리', endpoint: '/api/admin/images' }
  ];

  for (const feature of features) {
    try {
      const response = await fetch(feature.endpoint);
      const result = await response.json();

      if (response.ok && result.success) {
        const count = result.data ? result.data.length : 0;
        console.log(`✅ ${feature.name}: ${count}개 데이터`);
      } else {
        console.log(`❌ ${feature.name}: 오류 - ${result.error || '연결 실패'}`);
      }
    } catch (error) {
      console.log(`❌ ${feature.name}: 예외 - ${error.message}`);
    }
  }
}

// 브라우저에서 실행 가능하도록 전역 등록
if (typeof window !== 'undefined') {
  window.testFinalSync = testFinalSync;
  window.testAdminFeatures = testAdminFeatures;
  console.log('✅ 테스트 함수들이 등록되었습니다.');
  console.log('📋 사용 방법:');
  console.log('   testFinalSync() - 전체 동기화 테스트');
  console.log('   testAdminFeatures() - 관리자 기능 테스트');
}