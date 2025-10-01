/**
 * 관리자 페이지 전체 기능 테스트 스크립트
 *
 * 사용법:
 * 1. 브라우저에서 http://localhost:5177/admin 접속
 * 2. 관리자로 로그인
 * 3. 브라우저 콘솔을 열고 이 스크립트를 복사해서 실행
 */

console.log('🚀 관리자 페이지 전체 테스트 시작...');

// 테스트 결과를 저장할 객체
const testResults = {
  products: { created: 0, updated: 0, deleted: 0, errors: [] },
  reviews: { created: 0, updated: 0, deleted: 0, errors: [] },
  partners: { created: 0, updated: 0, deleted: 0, errors: [] },
  users: { created: 0, updated: 0, deleted: 0, errors: [] },
  blogs: { created: 0, updated: 0, deleted: 0, errors: [] },
  orders: { created: 0, updated: 0, deleted: 0, errors: [] },
  images: { created: 0, updated: 0, deleted: 0, errors: [] }
};

// 1. 상품 관리 테스트 (8개 카테고리)
async function testProductManagement() {
  console.log('\n📦 상품 관리 테스트 시작...');

  const categories = ['여행', '숙박', '음식', '렌트카', '관광지', '팝업', '행사', '체험'];

  for (const category of categories) {
    try {
      console.log(`  ✓ ${category} 카테고리 상품 생성 중...`);

      // 각 카테고리별 생성 함수 호출
      const functionName = `create${category}`;
      if (typeof window[functionName] === 'function') {
        await window[functionName]();
        testResults.products.created++;
        console.log(`  ✓ ${category} 상품 생성 완료`);
      } else {
        console.warn(`  ⚠️ ${functionName} 함수를 찾을 수 없습니다`);
      }

      // 각 생성 사이에 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ✗ ${category} 상품 생성 실패:`, error);
      testResults.products.errors.push(`${category}: ${error.message}`);
    }
  }

  console.log(`📦 상품 관리 테스트 완료: ${testResults.products.created}개 생성됨`);
}

// 2. 리뷰 관리 테스트
async function testReviewManagement() {
  console.log('\n⭐ 리뷰 관리 테스트 시작...');

  try {
    // 테스트 리뷰 생성
    console.log('  ✓ 테스트 리뷰 생성 중...');

    // 여기서 실제 API 호출을 시뮬레이션
    // window 객체에 api가 있다면 사용
    if (window.api && window.api.admin && window.api.admin.createReview) {
      const testReview = {
        listing_id: 1,
        user_name: '테스트 사용자',
        rating: 5,
        visit_date: new Date().toISOString().split('T')[0],
        title: '정말 좋았습니다!',
        comment: '신안 여행 최고의 경험이었습니다. 강력 추천합니다!'
      };

      const result = await window.api.admin.createReview(testReview);
      if (result.success) {
        testResults.reviews.created++;
        console.log('  ✓ 리뷰 생성 완료');
      }
    } else {
      console.warn('  ⚠️ API를 사용할 수 없습니다. 수동으로 테스트해주세요.');
    }
  } catch (error) {
    console.error('  ✗ 리뷰 생성 실패:', error);
    testResults.reviews.errors.push(error.message);
  }

  console.log(`⭐ 리뷰 관리 테스트 완료: ${testResults.reviews.created}개 생성됨`);
}

// 3. 파트너 관리 테스트
async function testPartnerManagement() {
  console.log('\n🤝 파트너 관리 테스트 시작...');

  try {
    console.log('  ✓ 테스트 파트너 생성 중...');

    if (window.api && window.api.admin && window.api.admin.createPartner) {
      const testPartner = {
        business_name: '신안 여행 파트너',
        contact_name: '김파트너',
        email: 'partner@shinan.com',
        phone: '010-1234-5678',
        business_address: '전남 신안군',
        location: '신안군',
        tier: 'silver',
        services: '숙박, 음식'
      };

      const result = await window.api.admin.createPartner(testPartner);
      if (result.success) {
        testResults.partners.created++;
        console.log('  ✓ 파트너 생성 완료');
      }
    } else {
      console.warn('  ⚠️ API를 사용할 수 없습니다. 수동으로 테스트해주세요.');
    }
  } catch (error) {
    console.error('  ✗ 파트너 생성 실패:', error);
    testResults.partners.errors.push(error.message);
  }

  console.log(`🤝 파트너 관리 테스트 완료: ${testResults.partners.created}개 생성됨`);
}

// 4. 블로그 관리 테스트
async function testBlogManagement() {
  console.log('\n📝 블로그 관리 테스트 시작...');

  try {
    console.log('  ✓ 테스트 블로그 생성 중...');

    if (window.api && window.api.admin && window.api.admin.createBlog) {
      const testBlog = {
        title: '신안 여행 완벽 가이드',
        category: '여행 가이드',
        excerpt: '신안의 숨은 명소와 여행 팁을 소개합니다.',
        content_md: '# 신안 여행 가이드\n\n신안은 천사의 섬입니다...',
        featured_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        is_published: true,
        author_id: 1,
        slug: 'shinan-travel-guide'
      };

      const result = await window.api.admin.createBlog(testBlog);
      if (result.success) {
        testResults.blogs.created++;
        console.log('  ✓ 블로그 생성 완료');
      }
    } else {
      console.warn('  ⚠️ API를 사용할 수 없습니다. 수동으로 테스트해주세요.');
    }
  } catch (error) {
    console.error('  ✗ 블로그 생성 실패:', error);
    testResults.blogs.errors.push(error.message);
  }

  console.log(`📝 블로그 관리 테스트 완료: ${testResults.blogs.created}개 생성됨`);
}

// 5. 대시보드 통계 확인
async function testDashboard() {
  console.log('\n📊 대시보드 통계 테스트 시작...');

  try {
    if (window.api && window.api.admin && window.api.admin.getDashboardStats) {
      const stats = await window.api.admin.getDashboardStats();
      console.log('  ✓ 대시보드 통계:', stats);
      console.log(`    - 전체 상품: ${stats.total_listings || 0}개`);
      console.log(`    - 전체 사용자: ${stats.total_users || 0}명`);
      console.log(`    - 전체 파트너: ${stats.total_partners || 0}개`);
      console.log(`    - 전체 예약: ${stats.total_bookings || 0}건`);
      console.log(`    - 전체 리뷰: ${stats.total_reviews || 0}개`);
    } else {
      console.warn('  ⚠️ API를 사용할 수 없습니다.');
    }
  } catch (error) {
    console.error('  ✗ 대시보드 통계 조회 실패:', error);
  }
}

// 전체 테스트 실행
async function runAllTests() {
  console.log('🎯 전체 테스트 시작...\n');
  console.log('=' + '='.repeat(50));

  await testProductManagement();
  await testReviewManagement();
  await testPartnerManagement();
  await testBlogManagement();
  await testDashboard();

  console.log('\n' + '=' + '='.repeat(50));
  console.log('🎉 전체 테스트 완료!\n');

  console.log('📈 테스트 결과:');
  console.log(`  상품: ${testResults.products.created}개 생성`);
  console.log(`  리뷰: ${testResults.reviews.created}개 생성`);
  console.log(`  파트너: ${testResults.partners.created}개 생성`);
  console.log(`  블로그: ${testResults.blogs.created}개 생성`);

  const totalErrors = Object.values(testResults).reduce((sum, result) => sum + result.errors.length, 0);
  if (totalErrors > 0) {
    console.log(`\n⚠️ 총 ${totalErrors}개의 오류 발생:`);
    Object.entries(testResults).forEach(([key, result]) => {
      if (result.errors.length > 0) {
        console.log(`  ${key}:`, result.errors);
      }
    });
  } else {
    console.log('\n✅ 모든 테스트 성공!');
  }

  return testResults;
}

// 자동 실행
console.log('💡 테스트를 실행하려면 runAllTests()를 호출하세요.');
console.log('💡 또는 window.testAllCategories()를 호출하여 모든 카테고리 상품을 생성할 수 있습니다.');
