// 지금 바로 직접 테스트 실행
async function directTestNow() {
  console.log('🔥 === 지금 바로 직접 카테고리별 상품 생성 및 확인 테스트 ===');

  // 1. 먼저 관리자 로그인
  console.log('\n1️⃣ 관리자 로그인...');
  if (typeof window !== 'undefined' && window.adminLogin) {
    await window.adminLogin();
    console.log('✅ 관리자 로그인 완료');
  }

  // 2. 카테고리별 상품 생성 및 즉시 확인
  const categories = [
    { name: '여행', slug: 'tour', title: '신안 퍼플섬 당일투어', price: 45000 },
    { name: '숙박', slug: 'stay', title: '임자도 대광해수욕장 펜션', price: 120000 },
    { name: '음식', slug: 'food', title: '신안 전통 젓갈 맛집', price: 25000 },
    { name: '렌트카', slug: 'rentcar', title: '신안 여행 렌트카', price: 80000 },
    { name: '관광지', slug: 'tourist', title: '증도 태평염전', price: 15000 },
    { name: '팝업', slug: 'popup', title: '신안 해넘이 팝업 카페', price: 12000 },
    { name: '행사', slug: 'event', title: '신안 갯벌 축제', price: 8000 },
    { name: '체험', slug: 'experience', title: '신안 전통 소금 만들기', price: 20000 }
  ];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    console.log(`\n📋 ${i+1}/8 - ${cat.name} 카테고리 테스트 중...`);

    // A. 상품 생성
    console.log(`   📝 상품 생성 중: ${cat.title}`);
    try {
      const product = {
        category: cat.name,
        title: cat.title,
        description: `${cat.title} - 신안군의 특별한 ${cat.name} 경험을 제공합니다.`,
        price: cat.price.toString(),
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'],
        location: '전라남도 신안군',
        highlights: JSON.stringify(['신안군 특산', '고품질 서비스', '현지 체험']),
        included: JSON.stringify(['가이드 포함', '보험 포함']),
        excluded: JSON.stringify(['개인 용품', '추가 식사']),
        max_capacity: 20,
        min_capacity: 2,
        duration: '1일',
        language: '한국어',
        is_featured: false,
        is_active: true,
        is_published: true
      };

      const createResponse = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });

      const createResult = await createResponse.json();

      if (createResponse.ok && createResult.success) {
        console.log(`   ✅ ${cat.name} 상품 생성 성공! ID: ${createResult.data?.id}`);
      } else {
        console.log(`   ❌ ${cat.name} 상품 생성 실패: ${createResult.error}`);
        continue;
      }

    } catch (error) {
      console.log(`   ❌ ${cat.name} 상품 생성 오류: ${error.message}`);
      continue;
    }

    // B. 잠시 대기 (데이터베이스 동기화)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // C. 해당 카테고리 페이지에서 확인
    console.log(`   🔍 /${cat.slug} 페이지에서 확인 중...`);
    try {
      const checkResponse = await fetch(`/api/listings?category=${cat.slug}&limit=50`);
      const checkResult = await checkResponse.json();

      if (checkResponse.ok && checkResult.success) {
        const products = checkResult.data || [];
        const foundProduct = products.find(p => p.title === cat.title);

        if (foundProduct) {
          console.log(`   ✅ ${cat.name} 페이지에서 상품 확인됨! "${foundProduct.title}"`);
        } else {
          console.log(`   ❌ ${cat.name} 페이지에서 상품 없음! 총 ${products.length}개 상품:`);
          if (products.length > 0) {
            products.forEach((p, idx) => {
              console.log(`      ${idx+1}. ${p.title} (${p.category})`);
            });
          }
        }
      } else {
        console.log(`   ❌ ${cat.name} 페이지 API 오류: ${checkResult.error}`);
      }

    } catch (error) {
      console.log(`   ❌ ${cat.name} 페이지 확인 오류: ${error.message}`);
    }

    // D. 전체 상품 목록에서도 확인
    console.log(`   🔍 전체 상품 목록에서 확인 중...`);
    try {
      const allResponse = await fetch('/api/listings?limit=100');
      const allResult = await allResponse.json();

      if (allResponse.ok && allResult.success) {
        const allProducts = allResult.data || [];
        const foundInAll = allProducts.find(p => p.title === cat.title);

        if (foundInAll) {
          console.log(`   ✅ 전체 목록에서도 확인됨!`);
        } else {
          console.log(`   ❌ 전체 목록에서 없음! 총 ${allProducts.length}개:`);
          if (allProducts.length <= 10) {
            allProducts.forEach((p, idx) => {
              console.log(`      ${idx+1}. ${p.title} (${p.category})`);
            });
          }
        }
      }

    } catch (error) {
      console.log(`   ❌ 전체 목록 확인 오류: ${error.message}`);
    }

    console.log(`   ⏱️ ${cat.name} 카테고리 테스트 완료 - 다음 카테고리로...`);
  }

  // 3. 최종 통합 확인
  console.log('\n🎯 === 최종 통합 확인 ===');

  // 관리자 페이지 확인
  try {
    const adminResponse = await fetch('/api/admin/listings?limit=100');
    const adminResult = await adminResponse.json();
    const adminProducts = adminResult.data || [];
    console.log(`📊 관리자 페이지 총 상품: ${adminProducts.length}개`);
  } catch (error) {
    console.log('❌ 관리자 페이지 확인 실패');
  }

  // 각 카테고리 페이지 확인
  for (const cat of categories) {
    try {
      const catResponse = await fetch(`/api/listings?category=${cat.slug}&limit=10`);
      const catResult = await catResponse.json();
      const catProducts = catResult.data || [];
      console.log(`📂 ${cat.name} (/category/${cat.slug}): ${catProducts.length}개`);
    } catch (error) {
      console.log(`❌ ${cat.name} 확인 실패`);
    }
  }

  // 메인 페이지 확인
  try {
    const homeResponse = await fetch('/api/listings?limit=20&sortBy=popular');
    const homeResult = await homeResponse.json();
    const homeProducts = homeResult.data || [];
    console.log(`🏠 메인 페이지 상품: ${homeProducts.length}개`);
  } catch (error) {
    console.log('❌ 메인 페이지 확인 실패');
  }

  console.log('\n🎉 직접 테스트 완료! 위 결과를 확인하세요.');
  console.log('💡 각 카테고리 페이지를 수동으로 방문해서 상품이 표시되는지 확인하세요:');
  categories.forEach(cat => {
    console.log(`   - http://localhost:5179/category/${cat.slug} (${cat.name})`);
  });
}

// 개별 카테고리 테스트 함수들
async function test개별카테고리(categoryName) {
  const categoryMap = {
    '여행': { slug: 'tour', title: '신안 퍼플섬 당일투어', price: 45000 },
    '숙박': { slug: 'stay', title: '임자도 대광해수욕장 펜션', price: 120000 },
    '음식': { slug: 'food', title: '신안 전통 젓갈 맛집', price: 25000 },
    '렌트카': { slug: 'rentcar', title: '신안 여행 렌트카', price: 80000 },
    '관광지': { slug: 'tourist', title: '증도 태평염전', price: 15000 },
    '팝업': { slug: 'popup', title: '신안 해넘이 팝업 카페', price: 12000 },
    '행사': { slug: 'event', title: '신안 갯벌 축제', price: 8000 },
    '체험': { slug: 'experience', title: '신안 전통 소금 만들기', price: 20000 }
  };

  const cat = categoryMap[categoryName];
  if (!cat) {
    console.log(`❌ "${categoryName}" 카테고리를 찾을 수 없습니다.`);
    return;
  }

  console.log(`🎯 ${categoryName} 카테고리 개별 테스트 시작...`);

  // 생성
  const product = {
    category: categoryName,
    title: cat.title,
    description: `${cat.title} - 테스트용 상품`,
    price: cat.price.toString(),
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop']
  };

  const createResponse = await fetch('/api/admin/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });

  const createResult = await createResponse.json();
  console.log('생성 결과:', createResult.success ? '성공' : '실패', createResult.message || createResult.error);

  // 확인
  await new Promise(resolve => setTimeout(resolve, 1000));

  const checkResponse = await fetch(`/api/listings?category=${cat.slug}`);
  const checkResult = await checkResponse.json();
  const products = checkResult.data || [];
  console.log(`${categoryName} 페이지 상품 수:`, products.length);

  if (products.length > 0) {
    products.forEach(p => console.log(`  - ${p.title}`));
  }
}

// 브라우저에서 실행 가능하도록 전역 등록
if (typeof window !== 'undefined') {
  window.directTestNow = directTestNow;
  window.test개별카테고리 = test개별카테고리;

  // 개별 카테고리 테스트 함수들
  window.test여행 = () => test개별카테고리('여행');
  window.test숙박 = () => test개별카테고리('숙박');
  window.test음식 = () => test개별카테고리('음식');
  window.test렌트카 = () => test개별카테고리('렌트카');
  window.test관광지 = () => test개별카테고리('관광지');
  window.test팝업 = () => test개별카테고리('팝업');
  window.test행사 = () => test개별카테고리('행사');
  window.test체험 = () => test개별카테고리('체험');

  console.log('🔥 직접 테스트 함수들이 준비되었습니다!');
  console.log('📋 사용 방법:');
  console.log('   directTestNow() - 8개 카테고리 모두 직접 테스트');
  console.log('   test여행(), test숙박(), test음식() 등 - 개별 카테고리 테스트');
  console.log('');
  console.log('⚡ 지금 바로 실행하세요: directTestNow()');
}