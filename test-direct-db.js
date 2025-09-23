import { connect } from '@planetscale/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  url: process.env.VITE_PLANETSCALE_HOST?.replace(/'/g, '') || '',
  username: process.env.VITE_PLANETSCALE_USERNAME || '',
  password: process.env.VITE_PLANETSCALE_PASSWORD || ''
};

console.log('PlanetScale 연결 설정:');
console.log('- Host:', config.url ? '설정됨' : '❌ 누락');
console.log('- Username:', config.username ? '설정됨' : '❌ 누락');
console.log('- Password:', config.password ? '설정됨' : '❌ 누락');

async function testPlanetScaleConnection() {
  console.log('\n=== PlanetScale 데이터베이스 직접 연결 테스트 ===');

  try {
    const conn = connect(config);

    // 테스트 쿼리 실행
    console.log('연결 테스트 중...');
    const results = await conn.execute('SELECT 1 as test_value');

    console.log('✅ PlanetScale 연결 성공!');
    console.log('테스트 결과:', results.rows);

    // 데이터베이스 정보 확인
    try {
      const dbInfo = await conn.execute('SELECT DATABASE() as db_name, VERSION() as version');
      console.log('✅ 데이터베이스 정보:', dbInfo.rows);
    } catch (error) {
      console.log('⚠️ 데이터베이스 정보 조회 실패:', error.message);
    }

    // 테이블 목록 확인
    try {
      const tables = await conn.execute('SHOW TABLES');
      console.log('✅ 테이블 목록:', tables.rows.length, '개 테이블');
      tables.rows.forEach(row => {
        console.log('  -', Object.values(row)[0]);
      });
    } catch (error) {
      console.log('⚠️ 테이블 목록 조회 실패:', error.message);
    }

  } catch (error) {
    console.error('❌ PlanetScale 연결 실패:', error);
    console.log('\n문제 해결 방법:');
    console.log('1. .env 파일의 환경 변수 확인');
    console.log('2. PlanetScale 대시보드에서 연결 정보 재확인');
    console.log('3. 데이터베이스 브랜치가 활성화되어 있는지 확인');
  }
}

testPlanetScaleConnection();