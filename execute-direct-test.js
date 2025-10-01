// 지금 바로 실행할 직접 테스트
console.log('🔥 === 지금 바로 8개 카테고리 상품 생성 및 테스트 시작 ===');

async function executeDirectTest() {
  try {
    // 1. 관리자 로그인
    console.log('\n1️⃣ 관리자 로그인 시도...');

    const loginData = {
      email: 'admin@shinan.com',
      password: 'admin123'
    };

    // 로그인 시뮬레이션 (localStorage 직접 설정)
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth', JSON.stringify({
        user: loginData.email,
        token: 'admin-token',
        isAdmin: true
      }));
      console.log('✅ 관리자 로그인 완료 (localStorage 설정)');
    }

    // 2. 8개 상품 즉시 생성
    const products = [
      { category: '여행', title: '신안 퍼플섬 당일투어', price: 45000, slug: 'tour' },
      { category: '숙박', title: '임자도 대광해수욕장 펜션', price: 120000, slug: 'stay' },
      { category: '음식', title: '신안 전통 젓갈 맛집', price: 25000, slug: 'food' },
      { category: '렌트카', title: '신안 여행 렌트카', price: 80000, slug: 'rentcar' },
      { category: '관광지', title: '증도 태평염전', price: 15000, slug: 'tourist' },
      { category: '팝업', title: '신안 해넘이 팝업 카페', price: 12000, slug: 'popup' },
      { category: '행사', title: '신안 갯벌 축제', price: 8000, slug: 'event' },
      { category: '체험', title: '신안 전통 소금 만들기', price: 20000, slug: 'experience' }
    ];

    console.log('\n2️⃣ 8개 상품 생성 시작...');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\n📝 ${i+1}/8 - ${product.category} 상품 생성: ${product.title}`);

      try {
        // 상품 데이터 준비
        const productData = {
          category: product.category,
          title: product.title,
          description: `${product.title} - 신안군의 특별한 ${product.category} 경험을 제공합니다.`,
          price: product.price.toString(),
          location: '전라남도 신안군',
          duration: '1일',
          max_capacity: 20,
          min_capacity: 2,
          images: JSON.stringify(['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop']),
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

        // API 호출
        const response = await fetch('http://localhost:5179/api/admin/listings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin-token'
          },
          body: JSON.stringify(productData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log(`   ✅ 생성 성공: ID ${result.data?.id}`);
          successCount++;

          // 1초 대기 후 카테고리 페이지에서 확인
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 카테고리 페이지 확인
          const categoryCheck = await fetch(`http://localhost:5179/api/listings?category=${product.slug}`);
          const categoryResult = await categoryCheck.json();

          if (categoryCheck.ok && categoryResult.success) {
            const categoryProducts = categoryResult.data || [];
            const found = categoryProducts.find(p => p.title === product.title);

            if (found) {
              console.log(`   ✅ /category/${product.slug} 페이지에서 확인됨!`);
            } else {
              console.log(`   ❌ /category/${product.slug} 페이지에서 없음 (총 ${categoryProducts.length}개)`);
            }
          } else {
            console.log(`   ❌ 카테고리 페이지 확인 실패`);
          }

        } else {
          console.log(`   ❌ 생성 실패: ${result.error || '알 수 없는 오류'}`);
          failCount++;
        }

      } catch (error) {
        console.log(`   ❌ 생성 오류: ${error.message}`);
        failCount++;
      }

      // 각 상품 생성 후 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 3. 최종 결과 확인
    console.log('\n3️⃣ 최종 결과 확인...');
    console.log(`📊 생성 결과: 성공 ${successCount}개 / 실패 ${failCount}개`);

    // 전체 상품 확인
    try {
      const allResponse = await fetch('http://localhost:5179/api/listings?limit=100');
      const allResult = await allResponse.json();
      const allProducts = allResult.data || [];
      console.log(`🌐 전체 API 상품: ${allProducts.length}개`);

      // 관리자 페이지 확인
      const adminResponse = await fetch('http://localhost:5179/api/admin/listings?limit=100');
      const adminResult = await adminResponse.json();
      const adminProducts = adminResult.data || [];
      console.log(`🔧 관리자 페이지 상품: ${adminProducts.length}개`);

      // 카테고리별 확인
      console.log('\n📂 카테고리별 상품 수:');
      for (const product of products) {
        const catResponse = await fetch(`http://localhost:5179/api/listings?category=${product.slug}`);
        const catResult = await catResponse.json();
        const catProducts = catResult.data || [];
        console.log(`   ${product.category} (/category/${product.slug}): ${catProducts.length}개`);
      }

      // 동기화 상태 확인
      if (allProducts.length === adminProducts.length && allProducts.length >= successCount) {
        console.log('\n🎉 완벽한 동기화 성공!');
      } else {
        console.log('\n⚠️ 동기화 문제 발견:');
        console.log(`   전체 API: ${allProducts.length}개`);
        console.log(`   관리자: ${adminProducts.length}개`);
        console.log(`   생성된 상품: ${successCount}개`);
      }

    } catch (error) {
      console.log('❌ 최종 확인 실패:', error.message);
    }

    console.log('\n🎯 === 직접 테스트 완료 ===');
    console.log('💡 수동 확인 페이지:');
    products.forEach(product => {
      console.log(`   http://localhost:5179/category/${product.slug} (${product.category})`);
    });
    console.log('   http://localhost:5179/admin (관리자 페이지)');

  } catch (error) {
    console.error('❌ 전체 테스트 실패:', error);
  }
}

// 즉시 실행
executeDirectTest();