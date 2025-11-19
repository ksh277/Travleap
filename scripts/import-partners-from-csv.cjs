/**
 * CSV 데이터로 파트너 일괄 추가 스크립트
 * 관광지명으로 검색해서 정확한 주소 + 좌표 자동 추출
 */

const { connect } = require('@planetscale/database');
const https = require('https');
require('dotenv').config();

// Google Geocoding API 호출 함수
function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.log('⚠️  Google Maps API 키 없음 - 좌표 NULL로 저장');
      resolve({ lat: null, lng: null, formattedAddress: address });
      return;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=ko`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          if (json.status === 'OK' && json.results && json.results.length > 0) {
            const result = json.results[0];
            const location = result.geometry.location;

            resolve({
              lat: location.lat,
              lng: location.lng,
              formattedAddress: result.formatted_address
            });
          } else {
            console.log(`⚠️  좌표 찾기 실패 (${json.status})`);
            resolve({ lat: null, lng: null, formattedAddress: address });
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 딜레이 함수 (API 호출 제한 대응)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function importPartners() {
  const connection = connect({ url: process.env.DATABASE_URL });

  // CSV 데이터를 여기에 붙여넣으세요
  const csvInput = process.argv[2];

  if (!csvInput) {
    console.error('❌ CSV 파일 경로를 인자로 제공해주세요');
    console.log('사용법: node scripts/import-partners-from-csv.cjs "CSV데이터"');
    process.exit(1);
  }

  try {
    console.log('🚀 파트너 CSV 데이터 임포트 시작\n');
    console.log('=' + '='.repeat(80));

    const lines = csvInput.trim().split('\n');

    // 헤더 확인
    if (!lines[0].includes('지역') || !lines[0].includes('관광지')) {
      console.error('❌ 올바른 CSV 형식이 아닙니다');
      console.log('헤더: 지역,관광지,제목,내용,이미지URL');
      process.exit(1);
    }

    console.log(`\n📋 총 ${lines.length - 1}개 파트너 데이터 발견\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const results = [];

    // 헤더 제외하고 데이터 처리
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // CSV 파싱 (따옴표 안의 쉼표 처리)
      const values = [];
      let currentValue = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      const [region, placeName, title, description, imageUrls] = values;

      if (!placeName) {
        console.log(`⚠️  ${i}번째 줄 건너뜀 (장소명 없음)`);
        continue;
      }

      console.log(`\n${i}. 처리 중: ${placeName} (${region})`);
      console.log('-'.repeat(80));

      try {
        // 주소 생성: "전라남도 신안군 [지역] [관광지명]"
        const searchAddress = `전라남도 신안군 ${region} ${placeName}`;
        console.log(`📍 검색 주소: ${searchAddress}`);

        // Google Geocoding으로 좌표 검색
        console.log('🔍 좌표 검색 중...');
        const geoResult = await geocodeAddress(searchAddress);

        if (geoResult.lat && geoResult.lng) {
          console.log(`✅ 좌표 발견: ${geoResult.lat}, ${geoResult.lng}`);
          console.log(`📮 정확한 주소: ${geoResult.formattedAddress}`);
        } else {
          console.log('⚠️  좌표 없음 - NULL로 저장 (나중에 수동 입력 필요)');
        }

        // 이미지 URL 파싱
        const imageArray = imageUrls
          ? imageUrls.split(',').map(url => url.trim()).filter(url => url)
          : [];

        console.log(`🖼️  이미지 ${imageArray.length}개`);

        // 설명 정리
        const cleanDescription = description
          ? description.replace(/^["']|["']$/g, '').trim()
          : '';

        // 파트너 데이터 준비
        const partnerData = {
          business_name: placeName,
          contact_name: '신안군청 관광과',
          email: 'tour@shinan.go.kr',
          phone: '061-240-8356',
          mobile_phone: '061-240-8356',
          business_address: geoResult.formattedAddress || searchAddress,
          location: region,
          services: '관광지',
          base_price_text: '무료',
          description: cleanDescription,
          images: JSON.stringify(imageArray),
          business_hours: '연중무휴',
          lat: geoResult.lat,
          lng: geoResult.lng
        };

        // DB 삽입
        const result = await connection.execute(
          `INSERT INTO partners (
            user_id, business_name, contact_name, email, phone, mobile_phone,
            business_address, location, services, base_price_text,
            description, images, business_hours,
            lat, lng,
            status, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1, NOW(), NOW())`,
          [
            1, // user_id (관리자)
            partnerData.business_name,
            partnerData.contact_name,
            partnerData.email,
            partnerData.phone,
            partnerData.mobile_phone,
            partnerData.business_address,
            partnerData.location,
            partnerData.services,
            partnerData.base_price_text,
            partnerData.description,
            partnerData.images,
            partnerData.business_hours,
            partnerData.lat,
            partnerData.lng
          ]
        );

        console.log(`✅ DB 저장 성공! (ID: ${result.insertId})`);

        results.push({
          placeName,
          region,
          lat: geoResult.lat,
          lng: geoResult.lng,
          hasCoords: !!(geoResult.lat && geoResult.lng)
        });

        successCount++;

        // API 호출 제한 방지 (1초 대기)
        await delay(1000);

      } catch (error) {
        console.error(`❌ 실패: ${error.message}`);
        errors.push({ placeName, region, error: error.message });
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 임포트 결과:');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);

    // 좌표 통계
    const withCoords = results.filter(r => r.hasCoords).length;
    const withoutCoords = results.filter(r => !r.hasCoords).length;

    console.log(`\n🗺️  좌표 정보:`);
    console.log(`  ✅ 좌표 있음: ${withCoords}개`);
    console.log(`  ⚠️  좌표 없음: ${withoutCoords}개`);

    if (withoutCoords > 0) {
      console.log('\n⚠️  좌표 없는 파트너 (수동 입력 필요):');
      results.filter(r => !r.hasCoords).forEach(r => {
        console.log(`  - ${r.placeName} (${r.region})`);
      });
    }

    if (errors.length > 0) {
      console.log('\n❌ 실패한 항목:');
      errors.forEach(({ placeName, region, error }) => {
        console.log(`  - ${placeName} (${region}): ${error}`);
      });
    }

    console.log('\n✅ 완료! 가맹점 페이지에서 확인하세요.');
    console.log('   URL: http://localhost:5173/partners');

  } catch (error) {
    console.error('❌ 치명적 오류:', error);
    throw error;
  }
}

// 실행
importPartners();
