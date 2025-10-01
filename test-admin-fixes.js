// 🔧 관리자 페이지 수정사항 검증 스크립트
// 브라우저 콘솔에서 실행하여 문제 해결 상태를 확인합니다.

console.log('🔧 관리자 페이지 수정사항 검증 시작');
console.log('================================');

// 1️⃣ 세션 복원 상태 확인
console.log('\n1️⃣ 세션 복원 상태 검증');
if (typeof window !== 'undefined' && window.globalAuthState) {
  console.log('✅ 전역 인증 상태 접근 가능');
  console.log('🔐 현재 로그인 상태:', window.globalAuthState.isLoggedIn);
  console.log('👑 관리자 권한:', window.globalAuthState.isAdmin);
  console.log('👤 사용자 정보:', window.globalAuthState.user?.email || 'none');
  console.log('🎫 토큰 존재:', !!window.globalAuthState.token);
} else {
  console.log('❌ 전역 인증 상태에 접근할 수 없습니다');
}

// 2️⃣ 쿠키 및 저장소 확인
console.log('\n2️⃣ 세션 저장소 검증');
const authToken = document.cookie.split(';').find(c => c.trim().startsWith('auth_token='));
if (authToken) {
  console.log('✅ 쿠키에 인증 토큰 존재:', authToken.substring(0, 30) + '...');
} else {
  console.log('❌ 쿠키에 인증 토큰 없음');
}

const localToken = localStorage.getItem('auth_token');
if (localToken) {
  console.log('✅ 로컬스토리지에 백업 토큰 존재');
} else {
  console.log('❌ 로컬스토리지에 백업 토큰 없음');
}

// 3️⃣ API 함수 확인
console.log('\n3️⃣ API 함수 접근성 검증');
const checkApiFunction = (name, func) => {
  try {
    if (typeof func === 'function') {
      console.log(`✅ ${name}: 함수 정의됨`);
      return true;
    } else {
      console.log(`❌ ${name}: 함수 정의되지 않음`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: 접근 오류 - ${error.message}`);
    return false;
  }
};

// API 객체가 전역에 노출되어 있는지 확인
if (typeof window !== 'undefined' && window.api) {
  console.log('✅ 전역 API 객체 접근 가능');

  // 주요 관리자 함수들 확인
  const adminFunctions = [
    'getDashboardStats',
    'getUsers',
    'getListings',
    'createListing',
    'updateListing',
    'deleteListing',
    'getReviews',
    'getPartners',
    'getBlogs',
    'createBlog',
    'getImages',
    'uploadImage'
  ];

  adminFunctions.forEach(funcName => {
    checkApiFunction(`api.admin.${funcName}`, window.api.admin?.[funcName]);
  });
} else {
  console.log('❌ 전역 API 객체에 접근할 수 없습니다');
}

// 4️⃣ 대시보드 데이터 테스트
console.log('\n4️⃣ 대시보드 DB 연동 테스트');
if (typeof window !== 'undefined' && window.api?.admin?.getDashboardStats) {
  console.log('🔄 대시보드 통계 로드 테스트 중...');

  window.api.admin.getDashboardStats()
    .then(stats => {
      if (stats) {
        console.log('✅ 대시보드 통계 로드 성공:');
        console.log('   📊 총 사용자:', stats.total_users);
        console.log('   📊 총 파트너:', stats.total_partners);
        console.log('   📊 총 상품:', stats.total_listings);
        console.log('   📊 총 예약:', stats.total_bookings);
        console.log('   📊 총 리뷰:', stats.total_reviews);
        console.log('   💰 총 수익:', stats.total_revenue);
      } else {
        console.log('❌ 대시보드 통계 로드 실패 (null 반환)');
      }
    })
    .catch(error => {
      console.log('❌ 대시보드 통계 로드 오류:', error.message);
    });
} else {
  console.log('❌ getDashboardStats 함수에 접근할 수 없습니다');
}

// 5️⃣ 관리자 로그인 테스트 함수
console.log('\n5️⃣ 관리자 로그인 테스트 함수 제공');
window.testAdminLogin = () => {
  console.log('🔑 관리자 로그인 테스트 시작...');

  if (typeof window !== 'undefined' && window.adminLogin) {
    try {
      const result = window.adminLogin();
      if (result) {
        console.log('✅ 관리자 로그인 성공!');
        console.log('🔄 페이지를 새로고침하여 세션 복원을 테스트하세요.');
        return true;
      } else {
        console.log('❌ 관리자 로그인 실패');
        return false;
      }
    } catch (error) {
      console.log('❌ 관리자 로그인 오류:', error.message);
      return false;
    }
  } else {
    console.log('❌ adminLogin 함수에 접근할 수 없습니다');
    return false;
  }
};

// 6️⃣ 새로고침 테스트 안내
console.log('\n6️⃣ 새로고침 테스트 안내');
console.log('📝 수동 테스트 방법:');
console.log('   1. testAdminLogin() 실행하여 로그인');
console.log('   2. /admin 페이지로 이동');
console.log('   3. 페이지 새로고침 (F5 또는 Ctrl+R)');
console.log('   4. 로그인 페이지로 리디렉션되지 않고 관리자 페이지 유지되는지 확인');

// 7️⃣ 완료 메시지
console.log('\n🎉 검증 스크립트 실행 완료');
console.log('================================');
console.log('📋 다음 명령어를 사용할 수 있습니다:');
console.log('   - testAdminLogin(): 관리자 로그인 테스트');
console.log('   - window.globalAuthState: 전역 인증 상태 확인');
console.log('   - window.api.admin.getDashboardStats(): 대시보드 통계 테스트');