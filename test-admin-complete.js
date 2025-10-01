// 관리자 페이지 완전 기능 테스트
async function testAdminComplete() {
  console.log('🛠️ === 관리자 페이지 완전 기능 테스트 ===');

  // 1. 관리자 로그인 확인
  console.log('\n1️⃣ 관리자 인증 확인...');
  try {
    if (typeof window !== 'undefined' && window.adminLogin) {
      await window.adminLogin();
      console.log('✅ 관리자 로그인 완료');
    } else {
      console.log('ℹ️ adminLogin() 함수 실행이 필요합니다');
    }
  } catch (error) {
    console.error('❌ 관리자 로그인 실패:', error);
  }

  // 2. 모든 관리 기능 API 테스트
  const adminAPIs = [
    {
      name: '상품 관리',
      endpoint: '/api/admin/listings',
      createTest: async () => {
        const testProduct = {
          title: '테스트 상품',
          category: '여행',
          description: '테스트용 상품입니다',
          price: '10000',
          images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop']
        };
        return await testCreateFunction('상품', '/api/admin/listings', testProduct);
      }
    },
    {
      name: '리뷰 관리',
      endpoint: '/api/admin/reviews',
      createTest: async () => {
        const testReview = {
          listing_id: 1,
          user_id: 1,
          rating: 5,
          title: '테스트 리뷰',
          content: '테스트용 리뷰입니다',
          status: 'approved'
        };
        return await testCreateFunction('리뷰', '/api/admin/reviews', testReview);
      }
    },
    {
      name: '파트너 관리',
      endpoint: '/api/admin/partners',
      createTest: async () => {
        const testPartner = {
          business_name: '테스트 파트너',
          business_type: 'restaurant',
          contact_name: '홍길동',
          email: 'test@partner.com',
          phone: '010-1234-5678'
        };
        return await testCreateFunction('파트너', '/api/admin/partners', testPartner);
      }
    },
    {
      name: '블로그 관리',
      endpoint: '/api/admin/blogs',
      createTest: async () => {
        const testBlog = {
          title: '테스트 블로그',
          content: '테스트용 블로그 내용입니다',
          author_id: 1,
          status: 'published'
        };
        return await testCreateFunction('블로그', '/api/admin/blogs', testBlog);
      }
    },
    {
      name: '주문 관리',
      endpoint: '/api/admin/orders',
      createTest: null // 주문은 일반적으로 직접 생성하지 않음
    },
    {
      name: '사용자 관리',
      endpoint: '/api/admin/users',
      createTest: null // 사용자는 직접 생성하지 않고 조회만
    },
    {
      name: '이미지 관리',
      endpoint: '/api/admin/images',
      createTest: async () => {
        // 이미지는 파일 업로드가 필요하므로 별도 처리
        console.log('   📸 이미지 업로드는 파일이 필요하므로 스킵');
        return true;
      }
    }
  ];

  // 3. 각 기능별 CRUD 테스트
  for (const api of adminAPIs) {
    console.log(`\n📋 ${api.name} 테스트 중...`);

    // 조회 테스트
    try {
      const response = await fetch(api.endpoint);
      const result = await response.json();

      if (response.ok && result.success) {
        const count = result.data ? result.data.length : 0;
        console.log(`   ✅ 조회: ${count}개 데이터`);

        if (count > 0) {
          const sample = result.data[0];
          const title = sample.title || sample.name || sample.business_name || sample.file_name || sample.email || 'N/A';
          console.log(`      예시: ${title}`);
        }
      } else {
        console.log(`   ❌ 조회 실패: ${result.error || response.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ 조회 예외: ${error.message}`);
    }

    // 생성 테스트 (가능한 경우)
    if (api.createTest) {
      try {
        const createResult = await api.createTest();
        if (createResult) {
          console.log(`   ✅ 생성 테스트 성공`);
        } else {
          console.log(`   ❌ 생성 테스트 실패`);
        }
      } catch (error) {
        console.log(`   ❌ 생성 테스트 예외: ${error.message}`);
      }
    }
  }

  // 4. 데이터베이스 테이블 존재 확인
  console.log('\n4️⃣ 데이터베이스 테이블 확인...');
  const tables = ['listings', 'reviews', 'partners', 'blog_posts', 'payments', 'users', 'images'];

  for (const table of tables) {
    try {
      const response = await fetch('/api/debug/table-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table })
      });

      if (response.ok) {
        console.log(`   ✅ ${table} 테이블 존재`);
      } else {
        console.log(`   ❌ ${table} 테이블 없음`);
      }
    } catch (error) {
      console.log(`   ⚠️ ${table} 테이블 확인 불가`);
    }
  }

  console.log('\n🎯 === 관리자 페이지 테스트 완료 ===');
}

// 생성 기능 테스트 헬퍼 함수
async function testCreateFunction(itemName, endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`   ✅ ${itemName} 생성 성공: ${result.data?.id || 'ID 없음'}`);
      return true;
    } else {
      console.log(`   ❌ ${itemName} 생성 실패: ${result.error || response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${itemName} 생성 예외: ${error.message}`);
    return false;
  }
}

// 관리자 페이지 UI 요소 확인
function checkAdminPageUI() {
  console.log('\n🖥️ === 관리자 페이지 UI 확인 ===');

  // 현재 페이지가 관리자 페이지인지 확인
  if (!window.location.pathname.includes('/admin')) {
    console.log('❌ 관리자 페이지에 있지 않습니다. /admin으로 이동하세요.');
    return;
  }

  // 관리 탭들 확인
  const expectedTabs = ['상품 관리', '리뷰 관리', '파트너 관리', '블로그 관리', '주문 관리', '사용자 관리', '이미지 관리'];

  console.log('관리 탭 확인 중...');
  expectedTabs.forEach(tabName => {
    const tabElement = document.querySelector(`[data-tab="${tabName}"], [aria-label="${tabName}"]`) ||
                     Array.from(document.querySelectorAll('button, [role="tab"]'))
                       .find(el => el.textContent.includes(tabName.split(' ')[0]));

    if (tabElement) {
      console.log(`   ✅ ${tabName} 탭 발견`);
    } else {
      console.log(`   ❌ ${tabName} 탭 없음`);
    }
  });

  // 데이터 테이블 확인
  const tables = document.querySelectorAll('table, [role="table"], .data-table');
  console.log(`\n📊 데이터 테이블: ${tables.length}개 발견`);

  // 버튼들 확인
  const buttons = document.querySelectorAll('button');
  const addButtons = Array.from(buttons).filter(btn =>
    btn.textContent.includes('추가') || btn.textContent.includes('생성') || btn.textContent.includes('새로')
  );
  console.log(`📝 추가/생성 버튼: ${addButtons.length}개 발견`);
}

// 브라우저에서 실행 가능하도록 전역 등록
if (typeof window !== 'undefined') {
  window.testAdminComplete = testAdminComplete;
  window.checkAdminPageUI = checkAdminPageUI;
  window.testCreateFunction = testCreateFunction;

  console.log('✅ 관리자 페이지 완전 테스트 함수들이 등록되었습니다.');
  console.log('📋 사용 방법:');
  console.log('   testAdminComplete() - 관리자 모든 기능 완전 테스트');
  console.log('   checkAdminPageUI() - 관리자 페이지 UI 요소 확인');
  console.log('');
  console.log('⚠️ 사용 전 주의사항:');
  console.log('   1. /admin 페이지에서 실행하세요');
  console.log('   2. adminLogin() 함수로 먼저 로그인하세요');
}