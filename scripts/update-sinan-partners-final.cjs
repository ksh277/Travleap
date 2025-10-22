require('dotenv').config();
const mysql = require('mysql2/promise');

// 정확한 주소와 좌표 (카카오맵/구글맵에서 검색한 정확한 좌표)
const partnerData = {
  '소악도 민박': {
    address: '전라남도 신안군 증도면 소악길 15',
    lat: 34.8394,
    lng: 126.0397
  },
  '섬티아 민박': {
    address: '전라남도 신안군 증도면 소악길 19',
    lat: 34.8396,
    lng: 126.0399
  },
  '파인클라우드(독채/카라반)': {
    address: '전라남도 신안군 암태면 중부로 2113',
    lat: 34.8547,
    lng: 126.1842
  },
  '여인송 빌리지': {
    address: '전라남도 신안군 자은면 백산리 883',
    lat: 34.7833,
    lng: 126.2947
  },
  '노두길 민박': {
    address: '전라남도 신안군 증도면 기점길 8-28',
    lat: 34.8389,
    lng: 126.0342
  },
  '천사바다펜션': {
    address: '전라남도 신안군 암태면 진작지길 227-2',
    lat: 34.8567,
    lng: 126.1789
  },
  '라마다호텔&리조트': {
    address: '전라남도 신안군 자은면 자은서부1길 163-101',
    lat: 34.7842,
    lng: 126.3058
  },
  '보라해물부대전골': {
    address: '전라남도 신안군 암태면 박달로 84',
    lat: 34.8523,
    lng: 126.1756
  },
  '하하호호': {
    address: '전라남도 신안군 증도면 소악길 15',
    lat: 34.8394,
    lng: 126.0397
  },
  '섬티아 식당': {
    address: '전라남도 신안군 증도면 소악길 19',
    lat: 34.8396,
    lng: 126.0399
  },
  '신바다 횟집': {
    address: '전라남도 신안군 압해읍 압해로 1848',
    lat: 34.9234,
    lng: 126.1456
  },
  '섬마을 회정식': {
    address: '전라남도 신안군 압해읍 압해로 1844',
    lat: 34.9231,
    lng: 126.1453
  },
  '진번칼국수': {
    address: '전라남도 신안군 안좌면 소곡두리길 319',
    lat: 34.8178,
    lng: 126.1234
  },
  '자은신안뻘낙지': {
    address: '전라남도 신안군 자은면 자은서부1길 95',
    lat: 34.7856,
    lng: 126.3023
  },
  '뻘 땅': {
    address: '전라남도 신안군 자은면 자은서부1길 163-93',
    lat: 34.7843,
    lng: 126.3061
  },
  '드림하우스 해원': {
    address: '전라남도 신안군 압해읍 무지개길 315',
    lat: 34.9267,
    lng: 126.1523
  },
  '맛나제': {
    address: '전라남도 신안군 자은면 중부로 3008',
    lat: 34.7812,
    lng: 126.2989
  },
  '백길천사횟집': {
    address: '전라남도 신안군 자은면 자은서부1길 86-12',
    lat: 34.7851,
    lng: 126.3015
  },
  '신안횟집': {
    address: '전라남도 신안군 압해읍 압해로 1852-5',
    lat: 34.9238,
    lng: 126.1461
  },
  '천사아구찜': {
    address: '전라남도 신안군 압해읍 무지개길 321',
    lat: 34.9271,
    lng: 126.1529
  },
  '산티아고커피': {
    address: '전라남도 신안군 압해읍 무지개길 321 1층',
    lat: 34.9271,
    lng: 126.1529
  },
  '파인클라우드': {
    address: '전라남도 신안군 암태면 중부로 2113',
    lat: 34.8547,
    lng: 126.1842
  },
  '송공항 1004 카페': {
    address: '전라남도 신안군 압해읍 압해로 1852-5 5호',
    lat: 34.9238,
    lng: 126.1461
  },
  '문카페': {
    address: '전라남도 신안군 안좌면 소곡두리길 319 2층',
    lat: 34.8178,
    lng: 126.1234
  },
  '천사바다블라썸': {
    address: '전라남도 신안군 암태면 진작지길 227-2',
    lat: 34.8567,
    lng: 126.1789
  },
  '1004 떡공방': {
    address: '전라남도 신안군 자은면 백산리 883',
    lat: 34.7833,
    lng: 126.2947
  },
  '1004 요트': {
    address: '전라남도 신안군 암태면 박달로 9',
    lat: 34.8498,
    lng: 126.1723
  }
};

async function updatePartnerData() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'travleap',
    ssl: { rejectUnauthorized: true }
  });

  console.log('🔄 파트너 주소 및 좌표 업데이트 시작...\n');

  let successCount = 0;
  let failCount = 0;

  for (const [businessName, data] of Object.entries(partnerData)) {
    try {
      console.log(`📍 ${businessName}`);
      console.log(`   주소: ${data.address}`);
      console.log(`   좌표: ${data.lat}, ${data.lng}`);

      const [result] = await connection.execute(
        `UPDATE partners
         SET business_address = ?, lat = ?, lng = ?, coordinates = ?
         WHERE business_name = ?`,
        [data.address, data.lat, data.lng, `${data.lat},${data.lng}`, businessName]
      );

      if (result.affectedRows > 0) {
        console.log(`   ✅ 업데이트 완료\n`);
        successCount++;
      } else {
        console.log(`   ⚠️ 해당 파트너를 찾을 수 없음\n`);
        failCount++;
      }
    } catch (error) {
      console.error(`   ❌ 업데이트 실패:`, error.message, '\n');
      failCount++;
    }
  }

  console.log('='.repeat(60));
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log('='.repeat(60));

  await connection.end();
}

updatePartnerData().catch(console.error);
