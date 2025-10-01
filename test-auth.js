// 인증 시스템 테스트 스크립트
import { authService } from './utils/auth.js';
import { api } from './utils/api.js';

console.log('=== 인증 시스템 테스트 시작 ===');

async function testAuthentication() {
  try {
    console.log('\n1. 현재 인증 상태 확인...');
    const currentUser = await authService.getCurrentUser();
    console.log('현재 사용자:', currentUser);

    console.log('\n2. 기존 토큰 정리...');
    authService.logout();

    console.log('\n3. 관리자 계정 확인...');
    const adminUser = await api.getUserByEmail('admin@shinan.com');
    console.log('관리자 계정:', adminUser);

    if (!adminUser) {
      console.error('❌ 관리자 계정이 존재하지 않습니다!');
      return;
    }

    console.log('\n4. 관리자 로그인 테스트...');
    const loginResult = await authService.login({
      email: 'admin@shinan.com',
      password: 'admin123'
    });

    console.log('로그인 결과:', loginResult);

    if (loginResult.success) {
      console.log('✅ 로그인 성공!');

      console.log('\n5. 토큰 확인...');
      const token = authService.getAccessToken();
      console.log('액세스 토큰 존재:', !!token);

      console.log('\n6. 인증 상태 재확인...');
      const userAfterLogin = await authService.getCurrentUser();
      console.log('로그인 후 사용자:', userAfterLogin);

      console.log('\n7. 관리자 권한 확인...');
      const isAdmin = await authService.isAdmin();
      console.log('관리자 권한:', isAdmin);

      if (isAdmin) {
        console.log('✅ 모든 테스트 통과!');
      } else {
        console.log('❌ 관리자 권한 확인 실패');
      }
    } else {
      console.log('❌ 로그인 실패:', loginResult.error);
    }

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error);
  }
}

// 브라우저 환경에서 실행할 수 있도록 전역 함수로 노출
if (typeof window !== 'undefined') {
  window.testAuth = testAuthentication;
  console.log('브라우저 콘솔에서 testAuth() 실행 가능');
}

export { testAuthentication };