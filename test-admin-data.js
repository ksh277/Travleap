// 관리자 페이지 테스트 데이터 생성 스크립트
// 브라우저 콘솔에서 실행: node test-admin-data.js

console.log('🚀 관리자 페이지 테스트 데이터 생성 시작...');

// 브라우저에서 실행할 함수들 (개발자 도구 콘솔에서 실행)
const testFunctions = `
// 1. 데이터베이스 초기화 및 기본 데이터 생성
window.initTestData = async () => {
  try {
    console.log('📊 데이터베이스 초기화 중...');

    // forceReinitialize가 있는지 확인
    if (typeof window.forceReinitDB === 'function') {
      await window.forceReinitDB();
      console.log('✅ 데이터베이스 초기화 완료');
    } else {
      console.log('⚠️ forceReinitDB 함수를 찾을 수 없습니다.');
    }

    // 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 관리자 페이지가 있다면 새로고침
    if (window.location.pathname.includes('/admin')) {
      window.location.reload();
    }

    return true;
  } catch (error) {
    console.error('❌ 초기화 실패:', error);
    return false;
  }
};

// 2. 테스트 리뷰 생성
window.createTestReviews = async () => {
  try {
    console.log('⭐ 테스트 리뷰 생성 중...');

    const testReviews = [
      {
        listing_id: 1,
        user_id: 2,
        rating: 5,
        title: '정말 좋은 체험이었습니다!',
        comment_md: '증도 천일염 체험은 정말 특별했습니다. 가이드님의 설명도 좋았고 체험도 재미있었어요.',
        pros: '친절한 가이드, 재미있는 체험',
        cons: '조금 더 길었으면 좋겠어요',
        visit_date: '2024-01-15',
        is_published: true,
        is_visible: true
      },
      {
        listing_id: 2,
        user_id: 3,
        rating: 4,
        title: '아름다운 홍도',
        comment_md: '홍도의 자연경관이 정말 아름다웠습니다. 사진 찍기 좋은 곳이 많아요.',
        pros: '아름다운 경치, 좋은 날씨',
        cons: '배 시간이 아쉬웠어요',
        visit_date: '2024-01-20',
        is_published: true,
        is_visible: true
      },
      {
        listing_id: 3,
        user_id: 4,
        rating: 5,
        title: '최고의 펜션!',
        comment_md: '퍼플교 뷰가 정말 환상적이었습니다. 시설도 깨끗하고 좋았어요.',
        pros: '깨끗한 시설, 환상적인 뷰',
        cons: '없음',
        visit_date: '2024-01-25',
        is_published: true,
        is_visible: true
      }
    ];

    for (const review of testReviews) {
      // API를 통해 리뷰 생성
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });

      if (!response.ok) {
        console.warn('리뷰 생성 실패:', review.title);
      }
    }

    console.log('✅ 테스트 리뷰 생성 완료');
    return true;
  } catch (error) {
    console.error('❌ 리뷰 생성 실패:', error);
    return false;
  }
};

// 3. 테스트 파트너 신청 생성
window.createTestPartnerApplications = async () => {
  try {
    console.log('🤝 테스트 파트너 신청 생성 중...');

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
      }
    ];

    for (const application of testApplications) {
      // API를 통해 파트너 신청 생성
      const response = await fetch('/api/admin/partner-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(application)
      });

      if (!response.ok) {
        console.warn('파트너 신청 생성 실패:', application.business_name);
      }
    }

    console.log('✅ 테스트 파트너 신청 생성 완료');
    return true;
  } catch (error) {
    console.error('❌ 파트너 신청 생성 실패:', error);
    return false;
  }
};

// 4. 테스트 블로그 포스트 생성
window.createTestBlogs = async () => {
  try {
    console.log('📝 테스트 블로그 포스트 생성 중...');

    const testBlogs = [
      {
        title: '신안 여행 완전 가이드',
        slug: 'shinan-travel-complete-guide',
        content_md: '# 신안 여행 완전 가이드\\n\\n신안군은 1004개의 섬으로 이루어진 아름다운 지역입니다...',
        excerpt: '신안군 여행을 위한 완전한 가이드를 제공합니다.',
        featured_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
        tags: JSON.stringify(['여행', '신안', '가이드']),
        category: '여행 가이드',
        author_id: 1,
        is_published: true,
        is_featured: true
      },
      {
        title: '증도 천일염의 비밀',
        slug: 'jeungdo-salt-secret',
        content_md: '# 증도 천일염의 비밀\\n\\n증도는 세계 최대의 천일염 생산지입니다...',
        excerpt: '증도 천일염이 특별한 이유를 알아보세요.',
        featured_image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600',
        tags: JSON.stringify(['증도', '천일염', '체험']),
        category: '문화 체험',
        author_id: 1,
        is_published: true,
        is_featured: false
      }
    ];

    for (const blog of testBlogs) {
      // API를 통해 블로그 생성
      const response = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blog)
      });

      if (!response.ok) {
        console.warn('블로그 생성 실패:', blog.title);
      }
    }

    console.log('✅ 테스트 블로그 포스트 생성 완료');
    return true;
  } catch (error) {
    console.error('❌ 블로그 생성 실패:', error);
    return false;
  }
};

// 5. 모든 테스트 데이터 생성
window.createAllTestData = async () => {
  console.log('🚀 모든 테스트 데이터 생성 시작...');

  try {
    await window.initTestData();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await window.createTestReviews();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await window.createTestPartnerApplications();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await window.createTestBlogs();

    console.log('🎉 모든 테스트 데이터 생성 완료!');

    // 관리자 페이지라면 새로고침
    if (window.location.pathname.includes('/admin')) {
      setTimeout(() => window.location.reload(), 2000);
    }

    return true;
  } catch (error) {
    console.error('❌ 테스트 데이터 생성 실패:', error);
    return false;
  }
};

console.log('✅ 테스트 함수들이 준비되었습니다!');
console.log('📋 사용 방법:');
console.log('  1. window.initTestData() - 데이터베이스 초기화');
console.log('  2. window.createTestReviews() - 테스트 리뷰 생성');
console.log('  3. window.createTestPartnerApplications() - 테스트 파트너 신청 생성');
console.log('  4. window.createTestBlogs() - 테스트 블로그 생성');
console.log('  5. window.createAllTestData() - 모든 테스트 데이터 생성');
`;

console.log('📋 브라우저 콘솔에서 다음 코드를 실행하세요:');
console.log(testFunctions);
console.log('✅ 테스트 스크립트 준비 완료!');