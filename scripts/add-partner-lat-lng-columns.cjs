/**
 * partners 테이블에 lat, lng DECIMAL 컬럼 추가
 *
 * 목적: 카카오 주소 API로 받은 정확한 좌표를 저장
 * - lat: 위도 (latitude) - DECIMAL(10,7)
 * - lng: 경도 (longitude) - DECIMAL(10,7)
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function addLatLngColumns() {
  let connection;

  try {
    console.log('🚀 partners 테이블에 lat, lng 컬럼 추가 시작...\n');

    // PlanetScale 연결
    console.log('📡 데이터베이스 연결 중...');
    const dbUrl = new URL(process.env.VITE_DATABASE_URL);
    connection = await mysql.createConnection({
      host: dbUrl.hostname,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
      ssl: {
        rejectUnauthorized: true
      }
    });
    console.log('✅ 연결 성공\n');

    // 1. 기존 컬럼 확인
    console.log('🔍 기존 컬럼 확인 중...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'partners'
      AND COLUMN_NAME IN ('lat', 'lng')
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log(`   기존 컬럼: ${existingColumns.length > 0 ? existingColumns.join(', ') : '없음'}\n`);

    // 2. lat 컬럼 추가
    if (!existingColumns.includes('lat')) {
      console.log('➕ lat (위도) 컬럼 추가 중...');
      await connection.execute(`
        ALTER TABLE partners
        ADD COLUMN lat DECIMAL(10,7) NULL
        COMMENT '위도 (latitude)'
      `);
      console.log('   ✅ lat 컬럼 추가 완료\n');
    } else {
      console.log('   ⏭️  lat 컬럼 이미 존재\n');
    }

    // 3. lng 컬럼 추가
    if (!existingColumns.includes('lng')) {
      console.log('➕ lng (경도) 컬럼 추가 중...');
      await connection.execute(`
        ALTER TABLE partners
        ADD COLUMN lng DECIMAL(10,7) NULL
        COMMENT '경도 (longitude)'
      `);
      console.log('   ✅ lng 컬럼 추가 완료\n');
    } else {
      console.log('   ⏭️  lng 컬럼 이미 존재\n');
    }

    // 4. 결과 확인
    console.log('✅ 작업 완료!');
    console.log('\n📋 partners 테이블 좌표 컬럼:');
    console.log('   - lat  : DECIMAL(10,7) - 위도 (latitude)');
    console.log('   - lng  : DECIMAL(10,7) - 경도 (longitude)');
    console.log('\n💡 다음 단계:');
    console.log('   1. API에서 파트너 생성 시 lat, lng 값 저장');
    console.log('   2. 카카오 주소 API: x → lng, y → lat 매핑');
    console.log('   3. 기존 데이터 마이그레이션 (coordinates → lat, lng)');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 데이터베이스 연결 종료');
    }
  }
}

addLatLngColumns();
