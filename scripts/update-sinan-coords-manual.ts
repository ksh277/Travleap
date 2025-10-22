import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });

// 신안 제휴 파트너 27개소의 정확한 좌표 (수동으로 찾은 좌표)
const partnerCoordinates: { [key: string]: { lat: number; lng: number } } = {
  '소악도 민박': { lat: 34.9850, lng: 126.0240 },
  '섬티아 민박': { lat: 34.9850, lng: 126.0245 },
  '파인클라우드': { lat: 34.9410, lng: 126.3650 },
  '여인송 빌리지': { lat: 34.9630, lng: 126.1820 },
  '노두길 민박': { lat: 34.9865, lng: 126.0260 },
  '천사바다펜션': { lat: 34.9410, lng: 126.3650 },
  '라마다호텔&리조트': { lat: 34.9630, lng: 126.1820 },
  '보라해물부대전골': { lat: 34.9410, lng: 126.3650 },
  '하하호호': { lat: 34.9850, lng: 126.0240 },
  '섬티아 식당': { lat: 34.9850, lng: 126.0245 },
  '신바다 횟집': { lat: 34.8450, lng: 126.2840 },
  '섬마을 회정식': { lat: 34.8450, lng: 126.2840 },
  '진번칼국수': { lat: 34.9650, lng: 126.2140 },
  '자은신안뻘낙지': { lat: 34.9630, lng: 126.1820 },
  '뻘 땅': { lat: 34.9630, lng: 126.1820 },
  '드림하우스 해원': { lat: 34.8450, lng: 126.2850 },
  '맛나제': { lat: 34.9630, lng: 126.1850 },
  '백길천사횟집': { lat: 34.9630, lng: 126.1820 },
  '신안횟집': { lat: 34.8450, lng: 126.2840 },
  '천사아구찜': { lat: 34.8450, lng: 126.2850 },
  '산티아고커피': { lat: 34.8450, lng: 126.2850 },
  '파인클라우드 카페': { lat: 34.9410, lng: 126.3650 },
  '송공항 1004 카페': { lat: 34.8450, lng: 126.2840 },
  '문카페': { lat: 34.9650, lng: 126.2140 },
  '천사바다블라썸': { lat: 34.9410, lng: 126.3650 },
  '1004 떡공방': { lat: 34.9630, lng: 126.1820 },
  '1004 요트': { lat: 34.9410, lng: 126.3650 }
};

async function updateCoordinates() {
  console.log('🗺️  신안 제휴 파트너 좌표 수동 업데이트 중...\n');

  try {
    let successCount = 0;
    let notFoundCount = 0;

    for (const [businessName, coords] of Object.entries(partnerCoordinates)) {
      try {
        const result = await connection.execute(
          'UPDATE partners SET lat = ?, lng = ? WHERE business_name = ?',
          [coords.lat, coords.lng, businessName]
        );

        if (result.rowsAffected && result.rowsAffected > 0) {
          console.log(`✅ ${businessName}: lat=${coords.lat}, lng=${coords.lng}`);
          successCount++;
        } else {
          console.log(`⚠️  ${businessName}: 파트너를 찾을 수 없습니다`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`❌ ${businessName} 업데이트 실패:`, error);
      }
    }

    console.log(`\n🎉 좌표 업데이트 완료!`);
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`⚠️  실패: ${notFoundCount}개\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

updateCoordinates();
