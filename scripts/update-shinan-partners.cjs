const { connect } = require('@planetscale/database');
require('dotenv').config();

// 신안 관광지/축제/체험 좌표 및 이미지 데이터
const partnersData = {
  // ========== ATTRACTIONS ==========
  288: { // 퍼플섬 (반월도·박지도)
    lat: 34.7358, lng: 126.1156,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/purpleIsland1.jpg'])
  },
  289: { // 홍도
    lat: 34.6833, lng: 125.1833,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/hongdo1.jpg'])
  },
  290: { // 흑산도
    lat: 34.6847, lng: 125.4258,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/heuksando1.jpg'])
  },
  291: { // 증도 태평염전
    lat: 34.9841, lng: 126.1347,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/taepyeong1.jpg'])
  },
  292: { // 증도 짱뚱어다리
    lat: 34.9785, lng: 126.1412,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/jjangttungeo1.jpg'])
  },
  293: { // 무한의 다리
    lat: 34.9023, lng: 126.2156,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/infinity1.jpg'])
  },
  294: { // 천사섬 분재공원
    lat: 34.8285, lng: 126.2456,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/bonsai1.jpg'])
  },
  295: { // 임자도 대광해수욕장
    lat: 35.0892, lng: 126.0789,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/daegwang1.jpg'])
  },
  296: { // 비금도 하누넘해수욕장
    lat: 34.7412, lng: 125.9234,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/hanunum1.jpg'])
  },
  297: { // 안좌도 김환기 화백 생가
    lat: 34.7523, lng: 126.1089,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/kimhwanki1.jpg'])
  },
  298: { // 하의도 김대중 전 대통령 생가
    lat: 34.6834, lng: 126.0256,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/kimdaejung1.jpg'])
  },
  299: { // 옥도 작약군락지
    lat: 34.6912, lng: 126.0034,
    images: JSON.stringify(['https://www.shinan.go.kr/images/tour/peony1.jpg'])
  },

  // ========== EVENTS ==========
  280: { // 신안 섬 작약꽃 축제
    lat: 34.6912, lng: 126.0034,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/peony_festival1.jpg'])
  },
  281: { // 신안 아자니아 꽃 축제
    lat: 34.8312, lng: 126.2567,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/agapanthus1.jpg'])
  },
  282: { // 신안 섬 수국축제
    lat: 34.7789, lng: 125.9456,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/hydrangea1.jpg'])
  },
  283: { // 신안 섬 맨드라미 축제
    lat: 34.9456, lng: 126.1234,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/celosia1.jpg'])
  },
  284: { // 신안 피아노섬 축제
    lat: 34.8534, lng: 126.0678,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/piano1.jpg'])
  },
  285: { // 신안 보물섬 함초축제
    lat: 34.9841, lng: 126.1347,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/hamcho1.jpg'])
  },
  286: { // 신안 1004섬 분재정원 축제
    lat: 34.8285, lng: 126.2456,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/bonsai_festival1.jpg'])
  },
  287: { // 신안 튤립축제
    lat: 34.8500, lng: 126.1500,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/tulip1.jpg'])
  },
  308: { // 신안 섬 수선화 축제
    lat: 34.9234, lng: 126.2089,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/daffodil1.jpg'])
  },
  309: { // 신안 퍼플섬 라벤더 축제
    lat: 34.7358, lng: 126.1156,
    images: JSON.stringify(['https://www.shinan.go.kr/images/festival/lavender1.jpg'])
  },

  // ========== EXPERIENCES ==========
  300: { // 증도 소금박물관 염전체험
    lat: 34.9789, lng: 126.1289,
    images: JSON.stringify(['https://www.shinan.go.kr/images/experience/salt1.jpg'])
  },
  301: { // 증도 갯벌체험
    lat: 34.9750, lng: 126.1400,
    images: JSON.stringify(['https://www.shinan.go.kr/images/experience/mudflat1.jpg'])
  },
  302: { // 홍도 33경 유람선 투어
    lat: 34.6833, lng: 125.1833,
    images: JSON.stringify(['https://www.shinan.go.kr/images/experience/cruise1.jpg'])
  },
  303: { // 흑산도 낚시체험
    lat: 34.6847, lng: 125.4258,
    images: JSON.stringify(['https://www.shinan.go.kr/images/experience/fishing1.jpg'])
  },
  304: { // 기점·소악도 순례자의 길 트레킹
    lat: 34.9356, lng: 126.1189,
    images: JSON.stringify(['https://www.shinan.go.kr/images/experience/pilgrim1.jpg'])
  },
  305: { // 증도 모실길 걷기여행
    lat: 34.9800, lng: 126.1350,
    images: JSON.stringify(['https://www.shinan.go.kr/images/experience/mosil1.jpg'])
  },
  306: { // 퍼플섬 해상보행교 걷기
    lat: 34.7358, lng: 126.1156,
    images: JSON.stringify(['https://www.shinan.go.kr/images/experience/purple_bridge1.jpg'])
  },
  307: { // 자은도 해변 트레킹
    lat: 34.8534, lng: 126.0678,
    images: JSON.stringify(['https://www.shinan.go.kr/images/experience/jaeun_beach1.jpg'])
  }
};

async function updatePartners() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('=== 신안 파트너 좌표/이미지 업데이트 시작 ===\n');

  let updated = 0;
  let failed = 0;

  for (const [id, data] of Object.entries(partnersData)) {
    try {
      await conn.execute(`
        UPDATE partners
        SET lat = ?, lng = ?, images = ?
        WHERE id = ?
      `, [data.lat, data.lng, data.images, id]);

      console.log(`✅ [${id}] 업데이트 완료 - 좌표: ${data.lat}, ${data.lng}`);
      updated++;
    } catch (err) {
      console.log(`❌ [${id}] 업데이트 실패: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${updated}개`);
  console.log(`실패: ${failed}개`);
}

updatePartners().catch(console.error);
