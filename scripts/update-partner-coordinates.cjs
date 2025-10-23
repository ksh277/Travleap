/**
 * 기존 파트너의 주소로 좌표를 일괄 업데이트하는 스크립트
 *
 * 사용법: node scripts/update-partner-coordinates.cjs
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');

const KAKAO_API_KEY = process.env.VITE_KAKAO_APP_KEY || process.env.KAKAO_REST_API_KEY;

// 카카오 주소 검색 API
async function getCoordinatesFromAddress(address) {
  if (!KAKAO_API_KEY) {
    throw new Error('카카오 API 키가 설정되지 않았습니다.');
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`
        }
      }
    );

    const data = await response.json();

    // API 응답 로깅
    if (!response.ok || !data.documents || data.documents.length === 0) {
      console.error('카카오 API 응답:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
    }

    if (data.documents && data.documents.length > 0) {
      const coords = data.documents[0];
      return {
        lat: parseFloat(coords.y),  // 위도
        lng: parseFloat(coords.x),  // 경도
        address_name: coords.address_name
      };
    }

    return null;
  } catch (error) {
    console.error('좌표 검색 오류:', error);
    return null;
  }
}

async function updatePartnerCoordinates() {
  let connection;

  try {
    console.log('🚀 파트너 좌표 업데이트 시작...\n');

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

    // 업데이트할 파트너 목록 (주소가 있지만 좌표가 없는 파트너)
    const [partners] = await connection.query(`
      SELECT id, business_name, business_address, lat, lng
      FROM partners
      WHERE business_address IS NOT NULL
        AND (lat IS NULL OR lng IS NULL)
      LIMIT 50
    `);

    console.log(`📋 좌표 없는 파트너: ${partners.length}개\n`);

    if (partners.length === 0) {
      console.log('✅ 모든 파트너에 좌표가 설정되어 있습니다!');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const partner of partners) {
      const address = partner.business_address;

      console.log(`\n📍 [${partner.id}] ${partner.business_name}`);
      console.log(`   주소: ${address}`);

      // 좌표 검색
      const coords = await getCoordinatesFromAddress(address);

      if (coords) {
        // DB 업데이트
        await connection.execute(
          `UPDATE partners SET lat = ?, lng = ?, updated_at = NOW() WHERE id = ?`,
          [coords.lat, coords.lng, partner.id]
        );

        console.log(`   ✅ 좌표 업데이트 성공`);
        console.log(`      위도: ${coords.lat}, 경도: ${coords.lng}`);
        successCount++;
      } else {
        console.log(`   ⚠️  좌표를 찾을 수 없습니다`);
        failCount++;
      }

      // API 호출 제한 방지 (0.5초 대기)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 업데이트 결과:');
    console.log(`   ✅ 성공: ${successCount}개`);
    console.log(`   ⚠️  실패: ${failCount}개`);
    console.log('='.repeat(50));

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

// 스크립트 실행
updatePartnerCoordinates();
