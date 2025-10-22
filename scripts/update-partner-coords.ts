import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });
const KAKAO_REST_API_KEY = '8d901d330280f34d870802c3e8cc5e9d'; // index.html에 있는 키

// 카카오 주소 검색 API로 좌표 가져오기
async function getCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
      },
      params: {
        query: address
      }
    });

    if (response.data.documents && response.data.documents.length > 0) {
      const result = response.data.documents[0];
      return {
        lat: parseFloat(result.y),
        lng: parseFloat(result.x)
      };
    }
    return null;
  } catch (error) {
    console.error(`주소 검색 실패 (${address}):`, error);
    return null;
  }
}

async function updatePartnerCoordinates() {
  console.log('🗺️  신안 제휴 파트너 좌표 업데이트 중...\n');

  try {
    // 신안 파트너 목록 가져오기
    const result = await connection.execute(`
      SELECT id, business_name, business_address
      FROM partners
      WHERE business_address LIKE '%신안군%'
      ORDER BY id DESC
    `);

    console.log(`📍 총 ${result.rows.length}개 파트너의 좌표를 업데이트합니다.\n`);

    let successCount = 0;
    let failCount = 0;

    for (const partner of result.rows) {
      const { id, business_name, business_address } = partner as any;

      console.log(`처리 중: ${business_name} (${business_address})`);

      // 주소 전처리 - "신안군" 이후 부분만 사용 (더 정확한 검색)
      let searchAddress = business_address;

      // 카카오 API로 좌표 가져오기
      const coords = await getCoordinates(searchAddress);

      if (coords) {
        // DB 업데이트
        await connection.execute(
          'UPDATE partners SET lat = ?, lng = ? WHERE id = ?',
          [coords.lat, coords.lng, id]
        );
        console.log(`   ✅ 좌표 업데이트 성공: lat=${coords.lat}, lng=${coords.lng}\n`);
        successCount++;
      } else {
        console.log(`   ❌ 좌표를 찾을 수 없습니다.\n`);
        failCount++;
      }

      // API 요청 제한 방지를 위해 0.5초 대기
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n🎉 좌표 업데이트 완료!');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

updatePartnerCoordinates();
