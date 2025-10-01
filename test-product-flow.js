// 상품 생성 및 연동 테스트 스크립트
// 브라우저 콘솔에서 실행하거나 Node.js에서 실행 가능

async function testProductFlow() {
  console.log('🚀 상품 생성 및 연동 테스트 시작...');

  // 1. 관리자 로그인 테스트
  console.log('\n1️⃣ 관리자 로그인 테스트');
  try {
    if (typeof window !== 'undefined' && window.adminLogin) {
      await window.adminLogin();
      console.log('✅ 관리자 로그인 성공');
    } else {
      console.log('ℹ️ 브라우저에서 adminLogin() 함수를 실행하세요');
    }
  } catch (error) {
    console.error('❌ 관리자 로그인 실패:', error);
  }

  // 2. 상품 추가 모달 테스트
  console.log('\n2️⃣ 상품 추가 모달 테스트');
  try {
    if (typeof window !== 'undefined' && window.testModal) {
      window.testModal();
      console.log('✅ 상품 추가 모달 열기 성공');
    } else {
      console.log('ℹ️ 브라우저에서 testModal() 함수를 실행하세요');
    }
  } catch (error) {
    console.error('❌ 상품 추가 모달 테스트 실패:', error);
  }

  // 3. 전체 카테고리 상품 생성 테스트
  console.log('\n3️⃣ 전체 카테고리 상품 생성 테스트');
  try {
    if (typeof window !== 'undefined' && window.testAllCategories) {
      await window.testAllCategories();
      console.log('✅ 전체 카테고리 상품 생성 성공');
    } else {
      console.log('ℹ️ 브라우저에서 testAllCategories() 함수를 실행하세요');
    }
  } catch (error) {
    console.error('❌ 전체 카테고리 상품 생성 실패:', error);
  }

  // 4. 카테고리별 상품 생성 테스트
  console.log('\n4️⃣ 카테고리별 상품 생성 테스트');
  const categories = ['여행', '숙박', '음식', '렌트카', '관광지', '팝업', '행사', '체험'];

  for (const category of categories) {
    try {
      if (typeof window !== 'undefined' && window.testAddProduct) {
        window.testAddProduct(category);
        console.log(`✅ ${category} 카테고리 상품 모달 준비 성공`);
      } else {
        console.log(`ℹ️ 브라우저에서 testAddProduct("${category}") 함수를 실행하세요`);
      }
    } catch (error) {
      console.error(`❌ ${category} 카테고리 상품 테스트 실패:`, error);
    }
  }

  console.log('\n🔍 테스트 완료! 다음 단계를 수동으로 확인하세요:');
  console.log('5️⃣ 각 카테고리 페이지에서 상품 표시 확인');
  console.log('6️⃣ 가맹점 페이지에서 상품 카드 표시 확인');
  console.log('7️⃣ 상품 클릭시 상세페이지 이동 확인');

  console.log('\n📝 수동 확인 URL들:');
  console.log('- 여행: /category/tour');
  console.log('- 숙박: /category/stay');
  console.log('- 음식: /category/food');
  console.log('- 렌트카: /category/rentcar');
  console.log('- 관광지: /category/tourist');
  console.log('- 팝업: /category/popup');
  console.log('- 행사: /category/event');
  console.log('- 체험: /category/experience');
  console.log('- 가맹점: /partner');
  console.log('- 관리자: /admin');
}

// 브라우저에서 실행할 수 있도록 전역 함수로 등록
if (typeof window !== 'undefined') {
  window.testProductFlow = testProductFlow;
  console.log('✅ testProductFlow() 함수가 등록되었습니다. 브라우저 콘솔에서 실행하세요.');
}

// Node.js에서 실행하는 경우
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testProductFlow };
}

console.log('🔧 테스트 스크립트 로드 완료');
console.log('📖 사용법:');
console.log('1. 브라우저 개발자도구 콘솔에서 실행할 수 있는 함수들:');
console.log('   - adminLogin(): 관리자 로그인');
console.log('   - testModal(): 상품 추가 모달 열기');
console.log('   - testAllCategories(): 모든 카테고리 상품 생성');
console.log('');
console.log('🔧 디버깅 테스트:');
console.log('   - testSingleDebug(): 간단한 상품 하나만 생성해서 문제 진단');
console.log('');
console.log('2. 개별 카테고리 상품 생성 함수들:');
console.log('   - create여행(): 여행 상품 생성 → /category/tour 확인');
console.log('   - create숙박(): 숙박 상품 생성 → /category/stay 확인');
console.log('   - create음식(): 음식 상품 생성 → /category/food 확인');
console.log('   - create렌트카(): 렌트카 상품 생성 → /category/rentcar 확인');
console.log('   - create관광지(): 관광지 상품 생성 → /category/tourist 확인');
console.log('   - create팝업(): 팝업 상품 생성 → /category/popup 확인');
console.log('   - create행사(): 행사 상품 생성 → /category/event 확인');
console.log('   - create체험(): 체험 상품 생성 → /category/experience 확인');
console.log('');
console.log('3. 테스트 순서:');
console.log('   1) adminLogin() - 관리자 로그인');
console.log('   2) create여행() - 여행 상품 생성');
console.log('   3) /category/tour 페이지 방문하여 상품 확인');
console.log('   4) 다른 카테고리들도 동일하게 진행');

// 카테고리별 테스트 함수 추가
if (typeof window !== 'undefined') {
  window.testSingleCategory = async (categoryName) => {
    console.log(`🧪 ${categoryName} 카테고리 테스트 시작...`);

    const categoryFunctions = {
      '여행': 'create여행',
      '숙박': 'create숙박',
      '음식': 'create음식',
      '렌트카': 'create렌트카',
      '관광지': 'create관광지',
      '팝업': 'create팝업',
      '행사': 'create행사',
      '체험': 'create체험'
    };

    const urls = {
      '여행': '/category/tour',
      '숙박': '/category/stay',
      '음식': '/category/food',
      '렌트카': '/category/rentcar',
      '관광지': '/category/tourist',
      '팝업': '/category/popup',
      '행사': '/category/event',
      '체험': '/category/experience'
    };

    if (categoryFunctions[categoryName] && window[categoryFunctions[categoryName]]) {
      try {
        await window[categoryFunctions[categoryName]]();
        console.log(`✅ ${categoryName} 상품 생성 완료!`);
        console.log(`🔗 확인 URL: ${urls[categoryName]}`);
        return urls[categoryName];
      } catch (error) {
        console.error(`❌ ${categoryName} 상품 생성 실패:`, error);
      }
    } else {
      console.error(`❌ ${categoryName} 카테고리를 찾을 수 없습니다.`);
    }
  };

  window.testAllCategoriesSequentially = async () => {
    console.log('🚀 모든 카테고리 순차적 테스트 시작...');
    const categories = ['여행', '숙박', '음식', '렌트카', '관광지', '팝업', '행사', '체험'];

    for (const category of categories) {
      try {
        console.log(`\n📝 ${category} 카테고리 테스트 중...`);
        const url = await window.testSingleCategory(category);
        console.log(`✅ ${category} 완료 - 확인: ${url}`);

        // 잠시 대기 (API 호출 간격)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ ${category} 테스트 실패:`, error);
      }
    }

    console.log('\n🎉 모든 카테고리 테스트 완료!');
    console.log('📋 확인해야 할 URL들:');
    console.log('- /category/tour (여행)');
    console.log('- /category/stay (숙박)');
    console.log('- /category/food (음식)');
    console.log('- /category/rentcar (렌트카)');
    console.log('- /category/tourist (관광지)');
    console.log('- /category/popup (팝업)');
    console.log('- /category/event (행사)');
    console.log('- /category/experience (체험)');
    console.log('- /partner (가맹점 페이지 - 모든 상품 표시)');
  };
}