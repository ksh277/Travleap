/**
 * 신안군 관광지 파트너 일괄 추가
 * Google Geocoding으로 자동 좌표 변환
 */

const { connect } = require('@planetscale/database');
const https = require('https');
require('dotenv').config();

// 🔥 신안군 전체 관광지 데이터
const CSV_DATA = `지역,관광지,제목,내용,이미지URL
지도읍,지도향교,"조선시대의 마지막 향교 ""지도향교""","향교란 공자를 배양하는 문묘와 유생들의 교육을 위한 조선시대 공립교육기관이다. 신안군의 향교는 봉정산의 남쪽 기슭에 자리 하고 있다.",https://www.shinan.go.kr/images/tour/contents/sub02_0101_01.jpg
지도읍,송도수산시장,"물 반 병어 반, 물 반 민어 반 송도 수산시장","신안 북부 해역 일대에서 잡힌 물고기는 지도 송도수산시장으로 모인다.",https://www.shinan.go.kr/images/tour/contents/sub02_0101_02.jpg
임자면,1004섬 튤립ㆍ홍매화정원,신안튤립축제,"매년 봄 임자도 대광해변 일원에서 신안튤립축제를 개최한다.",https://www.shinan.go.kr/images/tour/contents/sub02_0401_01.jpg
임자면,대광해수욕장,바닷가에서 추억만들기 대광해수욕장,"백사장 길이 12km, 너비 300m로 임자도 서쪽에 있다.","https://www.shinan.go.kr/images/tour/contents/sub02_0401_02.jpg, https://www.shinan.go.kr/images/tour/contents/sub02_0401_04.jpg"
임자면,용난굴,용난굴,"임자도의 유명한 동굴","https://www.shinan.go.kr/images/tour/contents/sub02_0401_03_02.jpg, https://www.shinan.go.kr/images/tour/contents/sub02_0401_03.jpg"
임자면,전장포항,전장포항,"우리나라 새우젓의 대명사 전장포",https://www.shinan.go.kr/images/tour/contents/sub02_0401_05.jpg
임자면,조희룡 유배지,조희룡 유배지,"조선후기 문인화의 대가 조희룡이 유배생활을 했던 곳",https://www.shinan.go.kr/images/tour/contents/sub02_0401_06.jpg
압해읍,1004섬 분재정원,다도해의 아름다운 바다정원 분재정원,"천사섬 분재정원",https://www.shinan.go.kr/images/tour/contents/sub02_0201_01.jpg
압해읍,저녁노을 미술관,저녁노을 미술관,"신안의 파도를 연상시키는 독창적인 건축미",https://www.shinan.go.kr/images/tour/contents/sub02_0201_02.jpg
압해읍,송공산 등산로,다도해 바다정원 산책 송공산 등산,"송공산 등산코스","https://www.shinan.go.kr/images/tour/contents/climbing_img04.jpg, https://www.shinan.go.kr/images/tour/contents/sg_img.jpg"`;

// Google Geocoding API
function geocodeAddress(address) {
  return new Promise((resolve) => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.log('⚠️  Google API 키 없음 - 좌표 NULL');
      resolve({ lat: null, lng: null, address });
      return;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=ko`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results[0]) {
            const loc = json.results[0].geometry.location;
            resolve({
              lat: loc.lat,
              lng: loc.lng,
              address: json.results[0].formatted_address
            });
          } else {
            resolve({ lat: null, lng: null, address });
          }
        } catch (e) {
          resolve({ lat: null, lng: null, address });
        }
      });
    }).on('error', () => resolve({ lat: null, lng: null, address }));
  });
}

async function run() {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('\n🚀 신안군 관광지 파트너 임포트 시작!\n');
  console.log('='.repeat(80));

  const lines = CSV_DATA.trim().split('\n').slice(1); // 헤더 제외

  let success = 0, fail = 0;
  const withCoords = [], withoutCoords = [];

  for (const line of lines) {
    // CSV 파싱 (따옴표 안의 쉼표 처리)
    const values = [];
    let val = '', inQuote = false;

    for (const char of line) {
      if (char === '"') inQuote = !inQuote;
      else if (char === ',' && !inQuote) {
        values.push(val.trim());
        val = '';
      } else val += char;
    }
    values.push(val.trim());

    const [region, place, title, desc, imgs] = values;

    if (!place) continue;

    console.log(`\n📍 ${place} (${region})`);
    console.log('-'.repeat(80));

    try {
      // 주소: "전라남도 신안군 [지역] [장소명]"
      const searchAddr = `전라남도 신안군 ${region} ${place}`;
      console.log(`🔍 ${searchAddr}`);

      // 좌표 검색
      const geo = await geocodeAddress(searchAddr);

      if (geo.lat && geo.lng) {
        console.log(`✅ 좌표: ${geo.lat}, ${geo.lng}`);
        withCoords.push(place);
      } else {
        console.log(`⚠️  좌표 없음`);
        withoutCoords.push(place);
      }

      // 이미지 배열
      const images = imgs ? imgs.split(',').map(s => s.trim()).filter(Boolean) : [];

      // DB 저장
      await db.execute(
        `INSERT INTO partners (
          user_id, business_name, contact_name, email, phone, mobile_phone,
          business_address, location, services, base_price_text,
          description, images, business_hours, lat, lng,
          status, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1, NOW(), NOW())`,
        [
          1, // user_id (관리자)
          place,
          '신안군청 관광과',
          'tour@shinan.go.kr',
          '061-240-8356',
          '061-240-8356',
          geo.address || searchAddr,
          region,
          '관광지',
          '무료',
          desc.replace(/^["']|["']$/g, ''),
          JSON.stringify(images),
          '연중무휴',
          geo.lat,
          geo.lng
        ]
      );

      console.log(`✅ DB 저장 완료`);
      success++;

      // API 제한 방지
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(`❌ ${err.message}`);
      fail++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 결과:');
  console.log(`✅ 성공: ${success}개`);
  console.log(`❌ 실패: ${fail}개`);
  console.log(`\n🗺️  좌표:`);
  console.log(`  ✅ 있음: ${withCoords.length}개`);
  console.log(`  ⚠️  없음: ${withoutCoords.length}개`);

  if (withoutCoords.length) {
    console.log('\n⚠️  좌표 없는 곳 (수동 입력 필요):');
    withoutCoords.forEach(p => console.log(`  - ${p}`));
  }

  console.log('\n✅ 완료! 가맹점 페이지 확인: http://localhost:5173/partners\n');
}

run();
