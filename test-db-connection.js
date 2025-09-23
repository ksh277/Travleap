import { api } from './utils/api.js';

async function testDatabaseConnection() {
  console.log('클라우드 데이터베이스 연결 테스트 시작...');

  try {
    // 연결 테스트
    const isConnected = await api.testConnection();

    if (isConnected) {
      console.log('✅ 데이터베이스 연결 성공!');

      // 기본 API 테스트
      console.log('\n기본 API 테스트 중...');

      // 여행 상품 목록 조회 테스트
      try {
        const items = await api.getTravelItems();
        console.log('✅ 여행 상품 조회 성공:', items?.length || 0, '개 항목');
      } catch (error) {
        console.log('⚠️ 여행 상품 조회 실패 (정상적일 수 있음):', error.message);
      }

      // 사용자 목록 조회 테스트
      try {
        const users = await api.getUsers();
        console.log('✅ 사용자 조회 성공:', users?.length || 0, '개 사용자');
      } catch (error) {
        console.log('⚠️ 사용자 조회 실패 (정상적일 수 있음):', error.message);
      }

    } else {
      console.log('❌ 데이터베이스 연결 실패');
      console.log('환경 변수를 확인해주세요:');
      console.log('- VITE_DATABASE_URL');
      console.log('- VITE_DATABASE_API_KEY');
    }

  } catch (error) {
    console.error('❌ 연결 테스트 중 오류 발생:', error);
    console.log('\n문제 해결 방법:');
    console.log('1. .env 파일에 PlanetScale 환경 변수 설정');
    console.log('2. PlanetScale 대시보드에서 연결 정보 확인');
    console.log('3. 데이터베이스 브랜치가 활성화되어 있는지 확인');
  }
}

// 환경 변수 확인
console.log('PlanetScale 환경 변수 확인:');
console.log('- VITE_PLANETSCALE_HOST:', process.env.VITE_PLANETSCALE_HOST ? '설정됨' : '❌ 누락');
console.log('- VITE_PLANETSCALE_USERNAME:', process.env.VITE_PLANETSCALE_USERNAME ? '설정됨' : '❌ 누락');
console.log('- VITE_PLANETSCALE_PASSWORD:', process.env.VITE_PLANETSCALE_PASSWORD ? '설정됨' : '❌ 누락');

testDatabaseConnection();