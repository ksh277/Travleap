// 완전한 로그인 플로우 테스트
console.log('🧪 Starting comprehensive login flow test...');

async function testCompleteLoginFlow() {
  try {
    // 1. 초기화
    console.log('1️⃣ 초기화 중...');
    localStorage.clear();

    // 2. 데이터베이스 초기화
    console.log('2️⃣ 데이터베이스 초기화...');
    if (typeof forceReinitDB === 'function') {
      await forceReinitDB();
    }

    // 3. 관리자 로그인 시도
    console.log('3️⃣ 관리자 로그인 시도...');
    if (typeof testAdminLogin === 'function') {
      await testAdminLogin();
    }

    // 4. 토큰 확인
    console.log('4️⃣ 토큰 확인...');
    const token = localStorage.getItem('travleap_token');
    console.log('Token exists:', !!token);

    // 5. 현재 헤더 상태 확인
    console.log('5️⃣ 헤더 상태 확인...');
    const headerButtons = document.querySelectorAll('button');
    const hasLogoutButton = Array.from(headerButtons).some(btn =>
      btn.textContent?.includes('로그아웃') || btn.textContent?.includes('Logout')
    );
    console.log('Header shows logout button:', hasLogoutButton);

    // 6. 관리자 페이지 접근 테스트
    console.log('6️⃣ 관리자 페이지 접근 테스트...');
    const currentPath = window.location.pathname;
    console.log('Current path:', currentPath);

    if (currentPath !== '/admin') {
      console.log('Navigating to admin page...');
      window.history.pushState({}, '', '/admin');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    console.log('✅ 로그인 플로우 테스트 완료');

  } catch (error) {
    console.error('❌ 로그인 플로우 테스트 실패:', error);
  }
}

// 전역으로 노출
window.testCompleteLoginFlow = testCompleteLoginFlow;

console.log('📋 사용 가능한 테스트 함수:');
console.log('- testCompleteLoginFlow(): 전체 로그인 플로우 테스트');

export { testCompleteLoginFlow };