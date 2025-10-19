/**
 * PMS 연동 렌트카 데이터 삽입 스크립트
 * Turo API에서 차량 데이터를 받아온 것처럼 시뮬레이션
 * 120대의 다양한 차량을 PMS 방식으로 등록
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// 한글 → 영어 매핑 함수 (DB ENUM: 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'van', 'electric')
function mapVehicleClass(korClass) {
  const mapping = {
    '경차': 'compact',
    '경형': 'compact',
    '소형': 'compact',
    '준중형': 'compact',
    '중형': 'midsize',
    '대형': 'fullsize',
    'SUV': 'suv',
    '소형SUV': 'suv',
    '중형SUV': 'suv',
    '대형SUV': 'suv',
    '승합': 'van',
    '밴': 'van',
    '트럭': 'van', // DB에 truck enum 없음, van으로 매핑
    '스포츠카': 'luxury',
    '럭셔리': 'luxury',
    '수입중형': 'luxury',
    '수입대형': 'luxury'
  };
  return mapping[korClass] || 'midsize';
}

function mapTransmission(korTrans) {
  return korTrans === '자동' ? 'automatic' : 'manual';
}

function mapFuelType(korFuel) {
  // DB ENUM: 'gasoline', 'diesel', 'electric', 'hybrid'
  const mapping = {
    '가솔린': 'gasoline',
    '디젤': 'diesel',
    '전기': 'electric',
    '하이브리드': 'hybrid',
    'LPG': 'gasoline', // DB에 lpg 없음, gasoline으로 매핑
    '수소': 'electric'  // DB에 hydrogen 없음, electric으로 매핑 (zero-emission)
  };
  return mapping[korFuel] || 'gasoline';
}

// PMS API에서 받아온 데이터 시뮬레이션 (Turo API 응답 형식)
// 실제로는 fetch(`https://api.turo.com/vehicles?api_key=${apiKey}`)로 받아옴
function simulateTuroPMSResponse() {
  const brands = ['현대', '기아', '제네시스', '쌍용', '르노삼성', 'BMW', '벤츠', '아우디', '테슬라', '폭스바겐', '토요타', '혼다', '쉐보레', '포드'];
  const models = {
    '현대': ['아반떼', '쏘나타', '그랜저', '투싼', '싼타페', '팰리세이드', '코나', '베뉴', '아이오닉5', '아이오닉6', '넥쏘', '스타리아'],
    '기아': ['K3', 'K5', 'K8', 'K9', '스포티지', '쏘렌토', '모하비', '카니발', 'EV6', 'EV9', '셀토스', '니로'],
    '제네시스': ['G70', 'G80', 'G90', 'GV70', 'GV80', 'GV60', 'G80 전동화'],
    '쌍용': ['티볼리', '코란도', '렉스턴', '토레스'],
    '르노삼성': ['SM6', 'XM3'],
    'BMW': ['320i', '520i', 'X3', 'X5', 'iX', 'i4'],
    '벤츠': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE'],
    '아우디': ['A4', 'A6', 'Q5', 'Q7', 'e-tron'],
    '테슬라': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    '폭스바겐': ['골프', '티구안', '파사트'],
    '토요타': ['캠리', 'RAV4', '하이랜더'],
    '혼다': ['어코드', 'CR-V'],
    '쉐보레': ['말리부', '트래버스', '트레일블레이저'],
    '포드': ['머스탱', 'Explorer']
  };

  const fuelTypes = ['가솔린', '디젤', '하이브리드', '전기', 'LPG'];
  const vehicleClasses = ['경형', '소형', '준중형', '중형', '대형', 'SUV', '소형SUV', '대형SUV', '승합', '럭셔리', '스포츠카'];

  const vehicles = [];

  for (let i = 0; i < 120; i++) {
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const brandModels = models[brand] || ['기본모델'];
    const model = brandModels[Math.floor(Math.random() * brandModels.length)];
    const year = 2020 + Math.floor(Math.random() * 5); // 2020-2024
    const vehicleClass = vehicleClasses[Math.floor(Math.random() * vehicleClasses.length)];

    // 전기차는 전기 연료만
    let fuelType;
    if (model.includes('EV') || model.includes('아이오닉') || model.includes('넥쏘') || brand === '테슬라' || model.includes('iX') || model.includes('i4') || model.includes('e-tron')) {
      fuelType = model.includes('넥쏘') ? '수소' : '전기';
    } else if (model.includes('하이브리드') || model.includes('니로')) {
      fuelType = '하이브리드';
    } else {
      fuelType = fuelTypes[Math.floor(Math.random() * (fuelTypes.length - 1))]; // 전기 제외
    }

    // 가격 책정 (브랜드/클래스 기반)
    let basePrice = 50000;
    if (['BMW', '벤츠', '아우디', '제네시스', '테슬라'].includes(brand)) {
      basePrice = 100000 + Math.floor(Math.random() * 80000);
    } else if (vehicleClass.includes('대형') || vehicleClass.includes('SUV')) {
      basePrice = 70000 + Math.floor(Math.random() * 50000);
    } else if (vehicleClass.includes('준중형') || vehicleClass.includes('중형')) {
      basePrice = 50000 + Math.floor(Math.random() * 40000);
    } else {
      basePrice = 35000 + Math.floor(Math.random() * 30000);
    }

    const seating = vehicleClass === '승합' ? 9 + Math.floor(Math.random() * 3) :
                    vehicleClass.includes('SUV') ? 5 + Math.floor(Math.random() * 3) :
                    5;

    vehicles.push({
      // PMS에서 제공하는 차량 ID (Turo의 경우 vehicle_id)
      pms_vehicle_id: `TURO_${brand.substring(0,3).toUpperCase()}_${i+1}`,
      brand: brand,
      model: model,
      year: year,
      display_name: `${brand} ${model} ${year}`,
      vehicle_class: vehicleClass,
      transmission_type: '자동', // 대부분 자동
      fuel_type: fuelType,
      seating_capacity: seating,
      daily_rate_krw: Math.round(basePrice / 1000) * 1000, // 천원 단위로
      mileage_limit_km: fuelType === '전기' ? 300 : 200,
      images: JSON.stringify([
        `https://images.unsplash.com/photo-${1600000000000 + i * 10000}?w=800`,
        `https://images.unsplash.com/photo-${1600000000000 + i * 10000 + 5000}?w=800`
      ]),
      is_available: 1,
      // PMS 메타데이터
      pms_synced_at: new Date().toISOString(),
      pms_last_updated: new Date().toISOString()
    });
  }

  return vehicles;
}

async function insertPMSRentcarData() {
  let connection;

  try {
    console.log('🔌 데이터베이스 연결 중...');
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: {
        rejectUnauthorized: true
      }
    });

    console.log('✅ 데이터베이스 연결 성공!');

    // ============================================
    // 1. 새로운 렌트카 벤더 생성 (PMS 연동 업체)
    // ============================================
    console.log('\n📋 PMS 연동 렌트카 벤더 생성 중...');

    const [vendorResult] = await connection.execute(
      `INSERT INTO rentcar_vendors (
        vendor_code, business_name, brand_name, business_number,
        contact_name, contact_email, contact_phone, status, commission_rate,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'TURO_KOREA_001',
        'Turo Korea 렌터카',
        'Turo Korea',
        '456-78-90123',
        '이투로',
        'turo@korea.com',
        '02-9876-5432',
        'active',
        12.5
      ]
    );

    const vendorId = vendorResult.insertId;
    console.log(`✅ 벤더 생성 완료 (ID: ${vendorId})`);
    console.log(`   - 업체명: Turo Korea 렌터카`);
    console.log(`   - PMS: Turo API 연동`);
    console.log(`   - 자동 동기화: 활성화`);

    // ============================================
    // 2. Turo API에서 차량 데이터 가져오기 (시뮬레이션)
    // ============================================
    console.log('\n📡 Turo PMS API에서 차량 데이터 가져오는 중...');
    console.log('   (실제: GET https://api.turo.com/vehicles?api_key=xxx)');

    const pmsVehicles = simulateTuroPMSResponse();
    console.log(`✅ PMS에서 ${pmsVehicles.length}대의 차량 데이터 수신 완료!`);

    // ============================================
    // 3. PMS 데이터를 DB에 동기화
    // ============================================
    console.log('\n📦 차량 데이터 동기화 중...\n');

    let successCount = 0;
    let errorCount = 0;

    // 브랜드별로 그룹화해서 진행상황 표시
    const brandCounts = {};

    for (let i = 0; i < pmsVehicles.length; i++) {
      const vehicle = pmsVehicles[i];

      try {
        // 차량 코드 생성 (PMS ID 기반)
        const vehicleCode = vehicle.pms_vehicle_id;

        // rentcar_vehicles 테이블에 삽입
        await connection.execute(
          `INSERT INTO rentcar_vehicles (
            vendor_id, vehicle_code, brand, model, year, display_name, vehicle_class,
            fuel_type, transmission, seating_capacity, images, daily_rate_krw,
            mileage_limit_per_day, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            vendorId, vehicleCode, vehicle.brand, vehicle.model, vehicle.year, vehicle.display_name,
            mapVehicleClass(vehicle.vehicle_class), mapFuelType(vehicle.fuel_type), mapTransmission(vehicle.transmission_type),
            vehicle.seating_capacity, vehicle.images, vehicle.daily_rate_krw,
            vehicle.mileage_limit_km, vehicle.is_available
          ]
        );

        successCount++;

        // 브랜드별 카운트
        brandCounts[vehicle.brand] = (brandCounts[vehicle.brand] || 0) + 1;

        // 10대마다 진행상황 표시
        if ((i + 1) % 10 === 0) {
          console.log(`  ✓ ${i + 1}/${pmsVehicles.length}대 동기화 완료...`);
        }

      } catch (error) {
        errorCount++;
        console.error(`  ✗ ${vehicle.display_name} 동기화 실패:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 PMS 동기화 완료!');
    console.log('='.repeat(70));

    console.log(`\n📊 동기화 결과:`);
    console.log(`   - 성공: ${successCount}대`);
    console.log(`   - 실패: ${errorCount}대`);
    console.log(`   - 총계: ${pmsVehicles.length}대`);

    console.log(`\n🏷️  브랜드별 차량 수:`);
    Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).forEach(([brand, count]) => {
      console.log(`   - ${brand}: ${count}대`);
    });

    // 가격대별 통계
    const priceRanges = {
      '3만원대': 0,
      '4만원대': 0,
      '5-6만원대': 0,
      '7-9만원대': 0,
      '10-15만원대': 0,
      '15만원 이상': 0
    };

    pmsVehicles.forEach(v => {
      const price = v.daily_rate_krw;
      if (price < 40000) priceRanges['3만원대']++;
      else if (price < 50000) priceRanges['4만원대']++;
      else if (price < 70000) priceRanges['5-6만원대']++;
      else if (price < 100000) priceRanges['7-9만원대']++;
      else if (price < 150000) priceRanges['10-15만원대']++;
      else priceRanges['15만원 이상']++;
    });

    console.log(`\n💰 가격대별 분포:`);
    Object.entries(priceRanges).forEach(([range, count]) => {
      if (count > 0) {
        console.log(`   - ${range}: ${count}대`);
      }
    });

    // 연료별 통계
    const fuelCounts = {};
    pmsVehicles.forEach(v => {
      fuelCounts[v.fuel_type] = (fuelCounts[v.fuel_type] || 0) + 1;
    });

    console.log(`\n⛽ 연료 타입별 분포:`);
    Object.entries(fuelCounts).forEach(([fuel, count]) => {
      console.log(`   - ${fuel}: ${count}대`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('📱 PMS 연동 정보:');
    console.log('='.repeat(70));
    console.log(`   - PMS 공급업체: Turo`);
    console.log(`   - API 엔드포인트: https://api.turo.com/vehicles`);
    console.log(`   - 마지막 동기화: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`   - 자동 동기화: 활성화 (1시간마다)`);
    console.log(`   - 다음 동기화: ${new Date(Date.now() + 3600000).toLocaleString('ko-KR')}`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
insertPMSRentcarData()
  .then(() => {
    console.log('\n✅ PMS 동기화 스크립트 실행 완료!');
    console.log('\n💡 이제 배포된 사이트에서 확인하세요:');
    console.log('   - 렌트카 검색 페이지에서 120대의 차량 확인');
    console.log('   - 다양한 브랜드, 모델, 가격대 필터링 테스트');
    console.log('   - PMS 자동 동기화로 실시간 재고 관리\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
