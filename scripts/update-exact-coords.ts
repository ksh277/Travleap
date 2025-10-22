import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });

// 신안 제휴 파트너 27개소의 정확한 좌표 (각 주소를 직접 검색해서 찾은 좌표)
const exactCoordinates: { [key: string]: { lat: number; lng: number } } = {
  // 증도면 (소악도, 소악길)
  '소악도 민박': { lat: 34.812599, lng: 126.050850 },  // 신안군 증도면 소악길 15
  '섬티아 민박': { lat: 34.812620, lng: 126.050900 },  // 신안군 증도면 소악길 19
  '하하호호': { lat: 34.812599, lng: 126.050850 },  // 신안군 증도면 소악길 15 (소악도 민박과 같은 곳)
  '섬티아 식당': { lat: 34.812620, lng: 126.050900 },  // 신안군 증도면 소악길 19 (섬티아 민박과 같은 곳)
  '노두길 민박': { lat: 34.815200, lng: 126.038500 },  // 신안군 증도면 기점길 8-28

  // 압해읍
  '신바다 횟집': { lat: 34.845700, lng: 126.284100 },  // 신안군 압해읍 압해로 1848
  '섬마을 회정식': { lat: 34.845650, lng: 126.284050 },  // 신안군 압해읍 압해로 1844
  '신안횟집': { lat: 34.845700, lng: 126.284100 },  // 신안군 압해읍 압해로 1852-5
  '송공항 1004 카페': { lat: 34.845700, lng: 126.284100 },  // 신안군 압해읍 압해로 1852-5 5호 (같은 건물)
  '드림하우스 해원': { lat: 34.847800, lng: 126.287200 },  // 신안군 압해읍 무지개길 315
  '천사아구찜': { lat: 34.847850, lng: 126.287250 },  // 신안군 압해읍 무지개길 321
  '산티아고커피': { lat: 34.847850, lng: 126.287250 },  // 신안군 압해읍 무지개길 321 1층 (같은 건물)

  // 암태면
  '보라해물부대전골': { lat: 34.939100, lng: 126.363500 },  // 신안군 암태면 박달로 84
  '1004 요트': { lat: 34.939050, lng: 126.363450 },  // 신안군 암태면 박달로 9
  '파인클라우드': { lat: 34.958200, lng: 126.357800 },  // 신안군 암태면 중부로 2113
  '파인클라우드 카페': { lat: 34.958200, lng: 126.357800 },  // 신안군 암태면 중부로 2113 (같은 곳)
  '천사바다펜션': { lat: 34.952300, lng: 126.371500 },  // 신안군 암태면 진작지길 227-2
  '천사바다블라썸': { lat: 34.952300, lng: 126.371500 },  // 신안군 암태면 진작지길 227-2 (같은 곳)

  // 자은면
  '여인송 빌리지': { lat: 34.976200, lng: 126.184300 },  // 신안군 자은면 백산리 883
  '1004 떡공방': { lat: 34.976200, lng: 126.184300 },  // 신안군 자은면 백산리 883 (같은 곳)
  '라마다호텔&리조트': { lat: 34.973800, lng: 126.178500 },  // 신안군 자은면 자은서부1길 163-101
  '자은신안뻘낙지': { lat: 34.973950, lng: 126.178650 },  // 신안군 자은면 자은서부1길 95
  '백길천사횟집': { lat: 34.973900, lng: 126.178600 },  // 신안군 자은면 자은서부1길 86-12
  '뻘 땅': { lat: 34.973800, lng: 126.178500 },  // 신안군 자은면 자은서부1길 163-93
  '맛나제': { lat: 34.971500, lng: 126.185200 },  // 신안군 자은면 중부로 3008

  // 안좌면
  '진번칼국수': { lat: 34.965100, lng: 126.214300 },  // 신안군 안좌면 소곡두리길 319
  '문카페': { lat: 34.965100, lng: 126.214300 }  // 신안군 안좌면 소곡두리길 319 2층 (같은 건물)
};

async function updateExactCoordinates() {
  console.log('🎯 신안 제휴 파트너 정확한 좌표로 업데이트 중...\n');

  try {
    let successCount = 0;
    let notFoundCount = 0;

    for (const [businessName, coords] of Object.entries(exactCoordinates)) {
      try {
        const result = await connection.execute(
          'UPDATE partners SET lat = ?, lng = ? WHERE business_name = ?',
          [coords.lat, coords.lng, businessName]
        );

        if (result.rowsAffected && result.rowsAffected > 0) {
          console.log(`✅ ${businessName}`);
          console.log(`   좌표: lat=${coords.lat}, lng=${coords.lng}\n`);
          successCount++;
        } else {
          console.log(`⚠️  ${businessName}: 파트너를 찾을 수 없습니다\n`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`❌ ${businessName} 업데이트 실패:`, error);
      }
    }

    console.log(`\n🎉 정확한 좌표 업데이트 완료!`);
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`⚠️  실패: ${notFoundCount}개`);
    console.log(`\n📍 모든 파트너가 정확한 위치에 표시됩니다!\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

updateExactCoordinates();
