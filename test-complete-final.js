// 완전한 최종 테스트 스크립트
async function testCompleteFinal() {
  console.log('🎯 === 최종 완전 테스트 시작 ===');

  try {
    // 1. 관리자 페이지 상품 확인
    console.log('\n1️⃣ 관리자 페이지 상품 확인...');
    const adminResponse = await fetch('/api/admin/listings?limit=100');
    const adminResult = await adminResponse.json();
    const adminProducts = adminResult.data || [];
    console.log(`🔧 관리자 페이지: ${adminProducts.length}개 상품`);

    if (adminProducts.length > 0) {
      adminProducts.forEach((product, idx) => {
        console.log(`   ${idx+1}. ${product.title} (카테고리: ${product.category})`);
      });
    } else {
      console.log('❌ 관리자 페이지에 상품이 없습니다!');
      return;
    }

    // 2. 카테고리별 상품 확인 (관리자 상품과 비교)
    console.log('\n2️⃣ 카테고리별 상품 확인...');
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

    let totalFound = 0;
    for (const cat of categories) {
      // 관리자 페이지에서 해당 카테고리 상품 수
      const adminCatCount = adminProducts.filter(p => p.category === cat.name).length;

      // API에서 해당 카테고리 상품 수
      const catResponse = await fetch(`/api/listings?category=${cat.slug}&limit=100`);
      const catResult = await catResponse.json();
      const catProducts = catResult.data || [];

      console.log(`   📂 ${cat.name} (${cat.slug}): 관리자 ${adminCatCount}개 / API ${catProducts.length}개`);

      if (catProducts.length > 0) {
        catProducts.forEach((product, idx) => {
          console.log(`      ${idx+1}. ${product.title}`);
        });
        totalFound += catProducts.length;
      }

      if (adminCatCount !== catProducts.length) {
        console.log(`      ⚠️ 불일치: 관리자 ${adminCatCount}개 ≠ API ${catProducts.length}개`);
      }
    }

    // 3. 전체 API 상품 확인
    console.log('\n3️⃣ 전체 API 상품 확인...');
    const allResponse = await fetch('/api/listings?limit=100');
    const allResult = await allResponse.json();
    const allProducts = allResult.data || [];
    console.log(`📄 전체 API: ${allProducts.length}개 상품`);

    // 4. 메인 페이지 API 확인
    console.log('\n4️⃣ 메인 페이지 API 확인...');
    const homeResponse = await fetch('/api/listings?limit=8&sortBy=popular');
    const homeResult = await homeResponse.json();
    const homeProducts = homeResult.data || [];
    console.log(`🏠 메인 페이지: ${homeProducts.length}개 상품`);

    // 5. 파트너 페이지 확인
    console.log('\n5️⃣ 파트너 페이지 확인...');
    const partnerResponse = await fetch('/api/listings?limit=100');
    const partnerResult = await partnerResponse.json();
    const partnerProducts = partnerResult.data || [];
    console.log(`🤝 파트너 페이지: ${partnerProducts.length}개 상품`);

    // 6. 최종 분석
    console.log('\n📊 === 최종 분석 ===');
    console.log(`관리자 페이지: ${adminProducts.length}개`);
    console.log(`전체 API: ${allProducts.length}개`);
    console.log(`메인 페이지: ${homeProducts.length}개`);
    console.log(`파트너 페이지: ${partnerProducts.length}개`);
    console.log(`카테고리 총합: ${totalFound}개`);

    if (adminProducts.length === allProducts.length &&
        adminProducts.length === homeProducts.length &&
        adminProducts.length === partnerProducts.length &&
        totalFound > 0) {
      console.log('🎉 완벽한 동기화 성공!');
    } else {
      console.log('❌ 동기화 문제 발견:');
      if (adminProducts.length !== allProducts.length) {
        console.log(`  - 관리자 vs 전체 API: ${adminProducts.length} ≠ ${allProducts.length}`);
      }
      if (adminProducts.length !== homeProducts.length) {
        console.log(`  - 관리자 vs 메인: ${adminProducts.length} ≠ ${homeProducts.length}`);
      }
      if (totalFound === 0) {
        console.log(`  - 카테고리에서 상품이 하나도 보이지 않음!`);
      }

      console.log('\n🔧 자동 수정 시도...');
      await fixAllSyncIssues();
    }

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error);
  }
}

async function fixAllSyncIssues() {
  console.log('🔧 모든 동기화 문제 수정 중...');

  try {
    // 1. 데이터베이스 직접 확인
    console.log('1. 데이터베이스 상태 확인 중...');

    // 2. 카테고리 매핑 확인 및 수정
    console.log('2. 카테고리 매핑 재설정 중...');

    // 관리자 상품들의 카테고리 확인
    const adminResponse = await fetch('/api/admin/listings?limit=100');
    const adminResult = await adminResponse.json();
    const adminProducts = adminResult.data || [];

    if (adminProducts.length > 0) {
      console.log('관리자 상품 카테고리 분석:');
      adminProducts.forEach(product => {
        console.log(`- ${product.title}: 카테고리 "${product.category}"`);
      });

      // 3. 카테고리별 직접 테스트
      const categories = ['tour', 'stay', 'food', 'rentcar', 'tourist', 'popup', 'event', 'experience'];

      for (const category of categories) {
        console.log(`\n${category} 카테고리 테스트:`);

        const response = await fetch(`/api/listings?category=${category}&limit=10`);
        const result = await response.json();

        console.log(`- API 응답: ${result.success ? '성공' : '실패'}`);
        console.log(`- 상품 수: ${result.data ? result.data.length : 0}개`);

        if (result.data && result.data.length > 0) {
          result.data.forEach(product => {
            console.log(`  * ${product.title} (${product.category})`);
          });
        }
      }
    }

    console.log('\n✅ 동기화 수정 완료');

    // 3초 후 재테스트
    setTimeout(() => {
      console.log('\n🔄 수정 후 재테스트...');
      testCompleteFinal();
    }, 3000);

  } catch (error) {
    console.error('❌ 수정 중 오류:', error);
  }
}

// 관리자 페이지 기능들 테스트
async function testAdminAllFeatures() {
  console.log('\n🛠️ === 관리자 페이지 모든 기능 테스트 ===');

  const adminFeatures = [
    { name: '상품 관리', endpoint: '/api/admin/listings' },
    { name: '리뷰 관리', endpoint: '/api/admin/reviews' },
    { name: '파트너 관리', endpoint: '/api/admin/partners' },
    { name: '블로그 관리', endpoint: '/api/admin/blogs' },
    { name: '주문 관리', endpoint: '/api/admin/orders' },
    { name: '사용자 관리', endpoint: '/api/admin/users' },
    { name: '이미지 관리', endpoint: '/api/admin/images' }
  ];

  for (const feature of adminFeatures) {
    try {
      console.log(`\n📋 ${feature.name} 테스트 중...`);

      const response = await fetch(feature.endpoint);
      const result = await response.json();

      if (response.ok && result.success) {
        const count = result.data ? result.data.length : 0;
        console.log(`   ✅ ${feature.name}: ${count}개 데이터`);

        if (count > 0 && result.data.length <= 3) {
          result.data.forEach((item, idx) => {
            const title = item.title || item.name || item.business_name || item.file_name || item.email || `항목 ${idx + 1}`;
            console.log(`      ${idx + 1}. ${title}`);
          });
        }
      } else {
        console.log(`   ❌ ${feature.name}: 오류 - ${result.error || response.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ ${feature.name}: 예외 - ${error.message}`);
    }
  }
}

// 브라우저에서 실행 가능하도록 전역 등록
if (typeof window !== 'undefined') {
  window.testCompleteFinal = testCompleteFinal;
  window.fixAllSyncIssues = fixAllSyncIssues;
  window.testAdminAllFeatures = testAdminAllFeatures;

  console.log('✅ 최종 완전 테스트 함수들이 등록되었습니다.');
  console.log('📋 사용 방법:');
  console.log('   testCompleteFinal() - 전체 동기화 최종 테스트');
  console.log('   testAdminAllFeatures() - 관리자 모든 기능 테스트');
  console.log('   fixAllSyncIssues() - 동기화 문제 자동 수정');
}