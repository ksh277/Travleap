// 관리자 페이지 완전 테스트 스크립트
// 브라우저 개발자 도구 콘솔에서 실행하세요

console.log('🚀 관리자 페이지 완전 테스트 시작...');

// 1. 전역 테스트 함수 정의
window.adminTestSuite = {
  // 데이터베이스 초기화 및 기본 데이터 생성
  initDatabase: async () => {
    console.log('🏗️ 데이터베이스 초기화 중...');

    if (typeof window.forceReinitDB === 'function') {
      await window.forceReinitDB();
      console.log('✅ 데이터베이스 초기화 완료');

      // 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    } else {
      console.error('❌ forceReinitDB 함수를 찾을 수 없습니다.');
      return false;
    }
  },

  // 테스트 리뷰 데이터 생성
  createTestReviews: async () => {
    console.log('⭐ 테스트 리뷰 생성 중...');

    try {
      // 상품 목록 먼저 조회
      const { api } = await import('./utils/api.js');
      const listingsResponse = await api.getListings({ limit: 10 });
      const listings = listingsResponse.data || [];

      if (listings.length === 0) {
        console.warn('⚠️ 상품이 없어서 리뷰를 생성할 수 없습니다.');
        return false;
      }

      const testReviews = [
        {
          listing_id: listings[0]?.id || 1,
          user_id: 2,
          rating: 5,
          title: '정말 좋은 체험이었습니다!',
          comment_md: '신안 여행은 정말 특별했습니다. 가이드님의 설명도 좋았고 체험도 재미있었어요.',
          pros: '친절한 가이드, 재미있는 체험',
          cons: '조금 더 길었으면 좋겠어요',
          visit_date: '2024-01-15',
          is_published: true,
          is_visible: true
        },
        {
          listing_id: listings[1]?.id || 2,
          user_id: 3,
          rating: 4,
          title: '아름다운 신안',
          comment_md: '신안의 자연경관이 정말 아름다웠습니다. 사진 찍기 좋은 곳이 많아요.',
          pros: '아름다운 경치, 좋은 날씨',
          cons: '교통이 조금 불편했어요',
          visit_date: '2024-01-20',
          is_published: true,
          is_visible: true
        },
        {
          listing_id: listings[2]?.id || 3,
          user_id: 4,
          rating: 5,
          title: '최고의 여행!',
          comment_md: '신안에서의 하루가 정말 환상적이었습니다. 시설도 깨끗하고 좋았어요.',
          pros: '깨끗한 시설, 환상적인 뷰',
          cons: '없음',
          visit_date: '2024-01-25',
          is_published: true,
          is_visible: true
        }
      ];

      let createdCount = 0;
      for (const review of testReviews) {
        try {
          const result = await api.admin.createReview(review);
          if (result.success) {
            createdCount++;
            console.log(`✅ 리뷰 생성 성공: ${review.title}`);
          } else {
            console.warn(`⚠️ 리뷰 생성 실패: ${review.title} - ${result.error}`);
          }
        } catch (error) {
          console.warn(`⚠️ 리뷰 생성 오류: ${review.title} - ${error.message}`);
        }
      }

      console.log(`✅ 테스트 리뷰 ${createdCount}개 생성 완료`);
      return true;
    } catch (error) {
      console.error('❌ 리뷰 생성 실패:', error);
      return false;
    }
  },

  // 테스트 파트너 신청 생성
  createTestPartnerApplications: async () => {
    console.log('🤝 테스트 파트너 신청 생성 중...');

    try {
      const { api } = await import('./utils/api.js');

      const testApplications = [
        {
          business_name: '신안 바다여행사',
          contact_name: '김바다',
          email: 'sea@shinan.com',
          phone: '010-1111-2222',
          business_number: '123-45-67890',
          business_address: '전남 신안군 지도읍',
          description: '신안군 전문 여행사로 해상 투어를 전문으로 합니다.',
          services: '해상 투어, 섬 여행 가이드',
          status: 'pending'
        },
        {
          business_name: '증도 천일염 체험장',
          contact_name: '박소금',
          email: 'salt@jeungdo.com',
          phone: '010-3333-4444',
          business_number: '234-56-78901',
          business_address: '전남 신안군 증도면',
          description: '증도 천일염 체험과 염전 관광을 제공합니다.',
          services: '천일염 체험, 염전 투어',
          status: 'pending'
        },
        {
          business_name: '홍도 자연관광',
          contact_name: '이홍도',
          email: 'hongdo@nature.com',
          phone: '010-5555-6666',
          business_number: '345-67-89012',
          business_address: '전남 신안군 홍도면',
          description: '홍도의 아름다운 자연을 안내하는 전문 가이드 업체입니다.',
          services: '자연 가이드, 트레킹 투어',
          status: 'pending'
        }
      ];

      let createdCount = 0;
      for (const application of testApplications) {
        try {
          const result = await api.createPartnerApplication(application);
          if (result.success) {
            createdCount++;
            console.log(`✅ 파트너 신청 생성 성공: ${application.business_name}`);
          } else {
            console.warn(`⚠️ 파트너 신청 생성 실패: ${application.business_name} - ${result.error}`);
          }
        } catch (error) {
          console.warn(`⚠️ 파트너 신청 생성 오류: ${application.business_name} - ${error.message}`);
        }
      }

      console.log(`✅ 테스트 파트너 신청 ${createdCount}개 생성 완료`);
      return true;
    } catch (error) {
      console.error('❌ 파트너 신청 생성 실패:', error);
      return false;
    }
  },

  // 테스트 블로그 포스트 생성
  createTestBlogs: async () => {
    console.log('📝 테스트 블로그 포스트 생성 중...');

    try {
      const { api } = await import('./utils/api.js');

      const testBlogs = [
        {
          title: '신안 여행 완전 가이드',
          slug: 'shinan-travel-complete-guide-' + Date.now(),
          content_md: `# 신안 여행 완전 가이드

신안군은 1004개의 섬으로 이루어진 아름다운 지역입니다.

## 주요 관광지
- 증도 천일염전
- 홍도 해상국립공원
- 퍼플교
- 비금도 해수욕장

## 여행 팁
- 사전 예약 필수
- 날씨 확인하고 방문
- 현지 가이드 추천`,
          excerpt: '신안군 여행을 위한 완전한 가이드를 제공합니다.',
          featured_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
          tags: ['여행', '신안', '가이드'],
          category: '여행 가이드',
          author_id: 1,
          is_published: true,
          is_featured: true
        },
        {
          title: '증도 천일염의 비밀',
          slug: 'jeungdo-salt-secret-' + Date.now(),
          content_md: `# 증도 천일염의 비밀

증도는 세계 최대의 천일염 생산지입니다.

## 천일염 제조 과정
1. 바닷물 끌어올리기
2. 햇빛으로 수분 증발
3. 소금 결정 생성
4. 수확 및 정제

## 체험 프로그램
- 염전 견학
- 직접 소금 만들기
- 소금 요리 체험`,
          excerpt: '증도 천일염이 특별한 이유를 알아보세요.',
          featured_image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600',
          tags: ['증도', '천일염', '체험'],
          category: '문화 체험',
          author_id: 1,
          is_published: true,
          is_featured: false
        },
        {
          title: '홍도의 사계절',
          slug: 'hongdo-four-seasons-' + Date.now(),
          content_md: `# 홍도의 사계절

홍도는 계절마다 다른 아름다움을 보여줍니다.

## 봄
- 동백꽃 만개
- 따뜻한 날씨

## 여름
- 시원한 바닷바람
- 해수욕 최적기

## 가을
- 단풍과 바다의 조화
- 등산하기 좋은 날씨

## 겨울
- 고요한 섬의 정취
- 겨울바다의 웅장함`,
          excerpt: '홍도의 사계절 아름다움을 담았습니다.',
          featured_image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600',
          tags: ['홍도', '사계절', '자연'],
          category: '자연 경관',
          author_id: 1,
          is_published: true,
          is_featured: false
        }
      ];

      let createdCount = 0;
      for (const blog of testBlogs) {
        try {
          const result = await api.admin.createBlog(blog);
          if (result.success) {
            createdCount++;
            console.log(`✅ 블로그 생성 성공: ${blog.title}`);
          } else {
            console.warn(`⚠️ 블로그 생성 실패: ${blog.title} - ${result.error}`);
          }
        } catch (error) {
          console.warn(`⚠️ 블로그 생성 오류: ${blog.title} - ${error.message}`);
        }
      }

      console.log(`✅ 테스트 블로그 ${createdCount}개 생성 완료`);
      return true;
    } catch (error) {
      console.error('❌ 블로그 생성 실패:', error);
      return false;
    }
  },

  // 모든 테스트 데이터 생성
  runFullTest: async () => {
    console.log('🎯 관리자 페이지 완전 테스트 시작...');

    try {
      // 1. 데이터베이스 초기화
      const dbInit = await window.adminTestSuite.initDatabase();
      if (!dbInit) {
        console.error('❌ 데이터베이스 초기화 실패');
        return false;
      }

      // 2. 기본 데이터 대기
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 3. 테스트 데이터 생성
      await window.adminTestSuite.createTestReviews();
      await new Promise(resolve => setTimeout(resolve, 1000));

      await window.adminTestSuite.createTestPartnerApplications();
      await new Promise(resolve => setTimeout(resolve, 1000));

      await window.adminTestSuite.createTestBlogs();
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🎉 모든 테스트 데이터 생성 완료!');

      // 4. 관리자 페이지라면 새로고침
      if (window.location.pathname.includes('/admin')) {
        console.log('🔄 관리자 페이지 새로고침 중...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

      return true;
    } catch (error) {
      console.error('❌ 전체 테스트 실패:', error);
      return false;
    }
  },

  // 관리자 기능 테스트
  testAdminFunctions: async () => {
    console.log('🔧 관리자 기능 테스트 시작...');

    try {
      const { api } = await import('./utils/api.js');

      const tests = [
        { name: '대시보드 통계', fn: () => api.admin.getDashboardStats() },
        { name: '상품 목록', fn: () => api.getListings() },
        { name: '리뷰 목록', fn: () => api.admin.getAllReviews() },
        { name: '파트너 목록', fn: () => api.admin.getPartners() },
        { name: '파트너 신청', fn: () => api.admin.getPartnerApplications() },
        { name: '사용자 목록', fn: () => api.admin.getAllUsers() },
        { name: '블로그 목록', fn: () => api.admin.getBlogs() },
        { name: '주문 목록', fn: () => api.admin.getOrders() },
        { name: '이미지 목록', fn: () => api.admin.getImages() }
      ];

      let passedTests = 0;
      for (const test of tests) {
        try {
          const result = await test.fn();
          if (result && (result.success !== false)) {
            console.log(`✅ ${test.name}: 성공`);
            passedTests++;
          } else {
            console.log(`⚠️ ${test.name}: 실패 - ${result?.error || '알 수 없는 오류'}`);
          }
        } catch (error) {
          console.log(`❌ ${test.name}: 오류 - ${error.message}`);
        }
      }

      console.log(`🎯 관리자 기능 테스트 완료: ${passedTests}/${tests.length} 통과`);
      return passedTests === tests.length;
    } catch (error) {
      console.error('❌ 관리자 기능 테스트 실패:', error);
      return false;
    }
  }
};

console.log('✅ 관리자 테스트 스위트 준비 완료!');
console.log(`
📋 사용 방법:
  1. window.adminTestSuite.initDatabase() - 데이터베이스 초기화
  2. window.adminTestSuite.createTestReviews() - 테스트 리뷰 생성
  3. window.adminTestSuite.createTestPartnerApplications() - 테스트 파트너 신청 생성
  4. window.adminTestSuite.createTestBlogs() - 테스트 블로그 생성
  5. window.adminTestSuite.testAdminFunctions() - 관리자 기능 테스트
  6. window.adminTestSuite.runFullTest() - 전체 테스트 실행

⚡ 빠른 시작: window.adminTestSuite.runFullTest()
`);