// 관리자 페이지 상품 생성 양식을 통한 직접 생성 테스트
async function adminFormCreate() {
  console.log('🔥 === 관리자 페이지 양식을 통한 직접 상품 생성 ===');

  // 1. 관리자 로그인 확인
  if (typeof window !== 'undefined' && window.adminLogin) {
    await window.adminLogin();
    console.log('✅ 관리자 로그인 완료');
  }

  // 2. 관리자 페이지로 이동
  if (window.location.pathname !== '/admin') {
    console.log('🔄 관리자 페이지로 이동 중...');
    if (window.navigate) {
      window.navigate('/admin');
    } else {
      window.location.href = '/admin';
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 3. 8개 카테고리 상품 데이터
  const products = [
    {
      category: '여행',
      title: '신안 퍼플섬 당일투어',
      description: '보라색으로 물든 아름다운 퍼플섬에서의 특별한 투어 체험',
      price: '45000',
      location: '전라남도 신안군 안좌면 퍼플섬',
      duration: '1일',
      maxCapacity: '20',
      minCapacity: '2',
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop']
    },
    {
      category: '숙박',
      title: '임자도 대광해수욕장 펜션',
      description: '12km 백사장 앞 오션뷰 펜션에서의 힐링 스테이',
      price: '120000',
      location: '전라남도 신안군 임자면 대광해수욕장',
      duration: '1박 2일',
      maxCapacity: '8',
      minCapacity: '2',
      images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop']
    },
    {
      category: '음식',
      title: '신안 전통 젓갈 맛집',
      description: '3대째 이어져온 전통 젓갈과 신선한 해산물 요리',
      price: '25000',
      location: '전라남도 신안군 지도읍',
      duration: '2시간',
      maxCapacity: '30',
      minCapacity: '2',
      images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop']
    },
    {
      category: '렌트카',
      title: '신안 여행 렌트카',
      description: '신안 섬 여행을 위한 편리한 렌트카 서비스',
      price: '80000',
      location: '전라남도 신안군',
      duration: '1일',
      maxCapacity: '5',
      minCapacity: '1',
      images: ['https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=300&fit=crop']
    },
    {
      category: '관광지',
      title: '증도 태평염전',
      description: '세계 최대 염전에서의 소금 만들기 체험',
      price: '15000',
      location: '전라남도 신안군 증도면',
      duration: '3시간',
      maxCapacity: '50',
      minCapacity: '5',
      images: ['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop']
    },
    {
      category: '팝업',
      title: '신안 해넘이 팝업 카페',
      description: '일몰과 함께하는 특별한 팝업 카페 경험',
      price: '12000',
      location: '전라남도 신안군 홍도면',
      duration: '2시간',
      maxCapacity: '20',
      minCapacity: '1',
      images: ['https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=400&h=300&fit=crop']
    },
    {
      category: '행사',
      title: '신안 갯벌 축제',
      description: '신안의 청정 갯벌에서 펼쳐지는 체험 축제',
      price: '8000',
      location: '전라남도 신안군 도초면',
      duration: '4시간',
      maxCapacity: '100',
      minCapacity: '1',
      images: ['https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop']
    },
    {
      category: '체험',
      title: '신안 전통 소금 만들기',
      description: '염전에서 직접 소금을 만드는 전통 체험',
      price: '20000',
      location: '전라남도 신안군 증도면',
      duration: '3시간',
      maxCapacity: '25',
      minCapacity: '3',
      images: ['https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop']
    }
  ];

  // 4. 각 상품을 관리자 페이지 양식을 통해 생성
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`\n📝 ${i+1}/8 - ${product.category} 상품 생성 중: ${product.title}`);

    try {
      // 상품 추가 버튼 클릭 시뮬레이션
      await simulateProductCreation(product);

      // 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 생성 확인
      const verified = await verifyProductCreation(product);
      if (verified) {
        console.log(`   ✅ ${product.category} 상품 생성 및 확인 완료!`);
      } else {
        console.log(`   ❌ ${product.category} 상품 생성 실패 또는 확인 불가`);
      }

    } catch (error) {
      console.log(`   ❌ ${product.category} 상품 생성 오류: ${error.message}`);
    }
  }

  // 5. 최종 전체 확인
  console.log('\n🎯 === 최종 전체 확인 ===');
  await finalVerification();
}

// 상품 생성 시뮬레이션
async function simulateProductCreation(product) {
  console.log(`   📋 양식 작성 중: ${product.title}`);

  // 실제 API 호출로 상품 생성
  const productData = {
    category: product.category,
    title: product.title,
    description: product.description,
    price: product.price,
    location: product.location,
    duration: product.duration,
    max_capacity: parseInt(product.maxCapacity),
    min_capacity: parseInt(product.minCapacity),
    images: JSON.stringify(product.images),
    highlights: JSON.stringify(['신안군 특산', '고품질 서비스', '현지 체험']),
    included: JSON.stringify(['가이드 포함', '보험 포함']),
    excluded: JSON.stringify(['개인 용품', '추가 식사']),
    language: '한국어',
    is_featured: false,
    is_active: true,
    is_published: true,
    rating_avg: 0,
    rating_count: 0,
    view_count: 0,
    booking_count: 0
  };

  const response = await fetch('/api/admin/listings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(productData)
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || '상품 생성 실패');
  }

  console.log(`   ✅ API 생성 완료: ID ${result.data?.id}`);
  return result.data;
}

// 상품 생성 확인
async function verifyProductCreation(product) {
  console.log(`   🔍 생성 확인 중: ${product.title}`);

  try {
    // 1. 관리자 페이지에서 확인
    const adminResponse = await fetch('/api/admin/listings?limit=100');
    const adminResult = await adminResponse.json();
    const adminProducts = adminResult.data || [];
    const foundInAdmin = adminProducts.find(p => p.title === product.title);

    if (!foundInAdmin) {
      console.log(`   ❌ 관리자 페이지에서 찾을 수 없음`);
      return false;
    }

    // 2. 해당 카테고리 페이지에서 확인
    const categoryMap = {
      '여행': 'tour', '숙박': 'stay', '음식': 'food', '렌트카': 'rentcar',
      '관광지': 'tourist', '팝업': 'popup', '행사': 'event', '체험': 'experience'
    };

    const categorySlug = categoryMap[product.category];
    const catResponse = await fetch(`/api/listings?category=${categorySlug}&limit=50`);
    const catResult = await catResponse.json();
    const catProducts = catResult.data || [];
    const foundInCategory = catProducts.find(p => p.title === product.title);

    if (!foundInCategory) {
      console.log(`   ❌ 카테고리 페이지(${categorySlug})에서 찾을 수 없음`);
      console.log(`      카테고리 페이지 상품 수: ${catProducts.length}개`);
      return false;
    }

    console.log(`   ✅ 관리자 페이지 ✓, 카테고리 페이지 ✓`);
    return true;

  } catch (error) {
    console.log(`   ❌ 확인 중 오류: ${error.message}`);
    return false;
  }
}

// 최종 전체 확인
async function finalVerification() {
  try {
    // 관리자 페이지 총 상품 수
    const adminResponse = await fetch('/api/admin/listings?limit=100');
    const adminResult = await adminResponse.json();
    const adminProducts = adminResult.data || [];
    console.log(`📊 관리자 페이지 총 상품: ${adminProducts.length}개`);

    // 각 카테고리별 상품 수
    const categories = [
      { name: '여행', slug: 'tour' },
      { name: '숙박', slug: 'stay' },
      { name: '음식', slug: 'food' },
      { name: '렌트카', slug: 'rentcar' },
      { name: '관광지', slug: 'tourist' },
      { name: '팝업', slug: 'popup' },
      { name: '행사', slug: 'event' },
      { name: '체험', slug: 'experience' }
    ];

    let totalCategoryProducts = 0;
    for (const cat of categories) {
      const catResponse = await fetch(`/api/listings?category=${cat.slug}&limit=20`);
      const catResult = await catResponse.json();
      const catProducts = catResult.data || [];
      console.log(`📂 ${cat.name} (/category/${cat.slug}): ${catProducts.length}개`);
      totalCategoryProducts += catProducts.length;

      if (catProducts.length > 0) {
        catProducts.forEach(p => {
          console.log(`     - ${p.title}`);
        });
      }
    }

    console.log(`📈 카테고리별 총합: ${totalCategoryProducts}개`);

    // 전체 API 상품 수
    const allResponse = await fetch('/api/listings?limit=100');
    const allResult = await allResponse.json();
    const allProducts = allResult.data || [];
    console.log(`🌐 전체 API 상품: ${allProducts.length}개`);

    // 동기화 확인
    if (adminProducts.length === allProducts.length && totalCategoryProducts > 0) {
      console.log('🎉 완벽한 동기화 성공!');
    } else {
      console.log('⚠️ 동기화 문제 있음:');
      console.log(`   관리자: ${adminProducts.length}, 전체 API: ${allProducts.length}, 카테고리 총합: ${totalCategoryProducts}`);
    }

  } catch (error) {
    console.log('❌ 최종 확인 실패:', error.message);
  }
}

// 브라우저에서 실행 가능하도록 전역 등록
if (typeof window !== 'undefined') {
  window.adminFormCreate = adminFormCreate;
  window.simulateProductCreation = simulateProductCreation;
  window.verifyProductCreation = verifyProductCreation;
  window.finalVerification = finalVerification;

  console.log('🔥 관리자 양식 생성 테스트 준비 완료!');
  console.log('📋 사용 방법:');
  console.log('   1. /admin 페이지로 이동');
  console.log('   2. adminFormCreate() 실행');
  console.log('');
  console.log('⚡ 지금 바로 실행: adminFormCreate()');
}