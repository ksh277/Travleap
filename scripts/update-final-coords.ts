import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });

// 신안 제휴 파트너 27개소 - 정확한 좌표 (제공받은 데이터)
const finalCoordinates: { [key: string]: { address: string; lat: number; lng: number; discount: string } } = {
  '소악도 민박': {
    address: '전남 신안군 증도면 소악길 15',
    lat: 34.6397,
    lng: 126.0672,
    discount: '방4개 전체 예약시 20,000원 할인'
  },
  '섬티아 민박': {
    address: '전남 신안군 증도면 소악길 19',
    lat: 34.6399,
    lng: 126.0675,
    discount: '방4개 전체 예약시 20,000원 할인'
  },
  '파인클라우드': {
    address: '전남 신안군 암태면 중부로 2113',
    lat: 34.7857,
    lng: 126.2348,
    discount: '숙박비 할인, 빵+음료 무료 및 입장권 할인'
  },
  '여인송 빌리지': {
    address: '전남 신안군 자은면 백산리 883',
    lat: 34.5674,
    lng: 126.3550,
    discount: '숙박비 할인'
  },
  '노두길 민박': {
    address: '전남 신안군 증도면 기점길 8-28',
    lat: 34.6451,
    lng: 126.0723,
    discount: '20인이상 단체시 방 1개 무료 제공'
  },
  '천사바다펜션': {
    address: '전남 신안군 암태면 진작지길 227-2',
    lat: 34.7810,
    lng: 126.2325,
    discount: '개인 10% / 단체: 비수기 25,000 / 성수기 30,000'
  },
  '라마다호텔&리조트': {
    address: '전남 신안군 자은면 자은서부1길 163-101',
    lat: 34.5620,
    lng: 126.3545,
    discount: '여행사단가표 기준 10%'
  },
  '보라해물부대전골': {
    address: '전남 신안군 암태면 박달로 84',
    lat: 34.7733,
    lng: 126.2254,
    discount: '단체(20인): 한 테이블당 생선구이 제공'
  },
  '하하호호': {
    address: '전남 신안군 증도면 소악길 15',
    lat: 34.6397,
    lng: 126.0672,
    discount: '식사 시 후식 음료 제공'
  },
  '섬티아 식당': {
    address: '전남 신안군 증도면 소악길 19',
    lat: 34.6399,
    lng: 126.0675,
    discount: '식사 시 아메리카노 1,000원 할인'
  },
  '신바다 횟집': {
    address: '전남 신안군 압해읍 압해로 1848',
    lat: 34.6785,
    lng: 126.2956,
    discount: '회덮밥 2,000원 할인'
  },
  '섬마을 회정식': {
    address: '전남 신안군 압해읍 압해로 1844',
    lat: 34.6786,
    lng: 126.2954,
    discount: '전 메뉴 인당 1,000원 할인'
  },
  '진번칼국수': {
    address: '전남 신안군 안좌면 소곡두리길 319',
    lat: 34.6804,
    lng: 126.3321,
    discount: '전 메뉴 인당 1,000원 할인'
  },
  '자은신안뻘낙지': {
    address: '전남 신안군 자은면 자은서부1길 95',
    lat: 34.6009,
    lng: 126.3857,
    discount: '전 메뉴 1인 1,000원 할인'
  },
  '뻘 땅': {
    address: '전남 신안군 자은면 자은서부1길 163-93',
    lat: 34.6015,
    lng: 126.3849,
    discount: '음료 제공'
  },
  '드림하우스 해원': {
    address: '전남 신안군 압해읍 무지개길 315',
    lat: 34.7072,
    lng: 126.3418,
    discount: '54,000(6,000원 할인)'
  },
  '맛나제': {
    address: '전남 신안군 자은면 중부로 3008',
    lat: 34.5972,
    lng: 126.3810,
    discount: '잡곡정식 2,000원 할인'
  },
  '백길천사횟집': {
    address: '전남 신안군 자은면 자은서부1길 86-12',
    lat: 34.5961,
    lng: 126.3833,
    discount: '음료 제공'
  },
  '신안횟집': {
    address: '전남 신안군 압해읍 압해로 1852-5',
    lat: 34.6792,
    lng: 126.2960,
    discount: '음료 제공'
  },
  '천사아구찜': {
    address: '전남 신안군 압해읍 무지개길 321',
    lat: 34.7070,
    lng: 126.3420,
    discount: '아구찜 1인 10% 할인'
  },
  '산티아고커피': {
    address: '전남 신안군 압해읍 무지개길 321 1층',
    lat: 34.7070,
    lng: 126.3420,
    discount: '음료 10% 할인'
  },
  '파인클라우드 카페': {
    address: '전남 신안군 암태면 중부로 2113',
    lat: 34.7857,
    lng: 126.2348,
    discount: '입장료 10,000원 (기존 13,000/15,000)'
  },
  '송공항 1004 카페': {
    address: '전남 신안군 압해읍 압해로 1852-5 5호',
    lat: 34.6789,
    lng: 126.2962,
    discount: '음료 5% 할인 및 땅콩빵 1개 증정'
  },
  '문카페': {
    address: '전남 신안군 안좌면 소곡두리길 319 2층',
    lat: 34.6805,
    lng: 126.3320,
    discount: '전 메뉴 10% 할인'
  },
  '천사바다블라썸': {
    address: '전남 신안군 암태면 진작지길 227-2',
    lat: 34.7810,
    lng: 126.2325,
    discount: '음료 10% 할인'
  },
  '1004 떡공방': {
    address: '전남 신안군 자은면 백산리 883',
    lat: 34.5674,
    lng: 126.3550,
    discount: '5,000원 이상 구매 시 아메리카노 무료 증정'
  },
  '1004 요트': {
    address: '전남 신안군 암태면 박달로 9',
    lat: 34.7771,
    lng: 126.2293,
    discount: '60분 투어 20,000원 이용권'
  }
};

async function updateFinalCoordinates() {
  console.log('🎯 신안 제휴 파트너 27개소 - 최종 좌표 업데이트\n');

  try {
    let successCount = 0;
    let notFoundCount = 0;
    const notFound: string[] = [];

    for (const [businessName, data] of Object.entries(finalCoordinates)) {
      try {
        // business_address도 함께 업데이트
        const result = await connection.execute(
          'UPDATE partners SET lat = ?, lng = ?, business_address = ? WHERE business_name = ?',
          [data.lat, data.lng, data.address, businessName]
        );

        if (result.rowsAffected && result.rowsAffected > 0) {
          console.log(`✅ ${businessName}`);
          console.log(`   주소: ${data.address}`);
          console.log(`   좌표: ${data.lat}, ${data.lng}`);
          console.log(`   할인: ${data.discount}\n`);
          successCount++;
        } else {
          console.log(`⚠️  ${businessName}: DB에서 찾을 수 없습니다\n`);
          notFound.push(businessName);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`❌ ${businessName} 업데이트 실패:`, error);
        notFound.push(businessName);
        notFoundCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 최종 업데이트 완료!');
    console.log('='.repeat(60));
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`⚠️  실패: ${notFoundCount}개`);

    if (notFound.length > 0) {
      console.log(`\n찾을 수 없는 파트너:`);
      notFound.forEach(name => console.log(`   - ${name}`));
    }

    console.log(`\n📍 모든 파트너가 정확한 위치에 표시됩니다!`);
    console.log(`🗺️  지도에서 확인: http://localhost:5173/partners\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

updateFinalCoordinates();
