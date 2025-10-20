import { db } from '../utils/database.js';
import fs from 'fs/promises';

async function executeRentcarTestData() {
  try {
    console.log('🚗 렌트카 테스트 데이터 추가 시작...\n');

    // Step 1: 업체 1 추가 (CSV용)
    console.log('1. CSV 업로드용 업체 추가...');
    const csvVendorResult = await db.execute(`
      INSERT INTO rentcar_vendors (
        vendor_code, business_name, brand_name, business_number,
        contact_name, contact_email, contact_phone,
        description, status, is_verified, commission_rate,
        api_enabled, total_vehicles,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      'CSV_VENDOR_001',
      '신안 퍼플렌터카',
      '퍼플렌터카',
      '123-45-67890',
      '김렌트',
      'purple@rentcar.com',
      '061-111-2222',
      '신안군 전 지역 렌터카 서비스. CSV 업로드 방식.',
      'active',
      1,
      10.00,
      0,
      0
    ]);

    const csvVendorId = csvVendorResult.insertId;
    console.log(`   ✅ CSV 업체 생성 완료 (ID: ${csvVendorId})\n`);

    // Step 2: 업체 2 추가 (API용)
    console.log('2. API 연동용 업체 추가...');
    const apiVendorResult = await db.execute(`
      INSERT INTO rentcar_vendors (
        vendor_code, business_name, brand_name, business_number,
        contact_name, contact_email, contact_phone,
        description, status, is_verified, commission_rate,
        api_enabled, api_url, api_key, api_auth_type, total_vehicles,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      'API_VENDOR_001',
      '증도 그린렌터카',
      '그린렌터카',
      '098-76-54321',
      '박자동',
      'green@rentcar.com',
      '061-333-4444',
      '증도면 전문 렌터카. API 자동 동기화.',
      'active',
      1,
      10.00,
      1,
      'http://localhost:3005/api/vehicles',
      'test_api_key_12345',
      'bearer',
      0
    ]);

    const apiVendorId = apiVendorResult.insertId;
    console.log(`   ✅ API 업체 생성 완료 (ID: ${apiVendorId})\n`);

    // Step 3: CSV 업체에 차량 3대 추가
    console.log('3. CSV 업체에 차량 3대 추가...');

    const vehicles = [
      {
        code: 'CSV001',
        brand: '현대',
        model: '쏘나타',
        name: '현대 쏘나타 2024',
        class: 'midsize',
        type: '세단',
        price: 60000,
        deposit: 120000,
        img: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400',
        features: ['스마트 크루즈 컨트롤', '후방 카메라', '열선 시트']
      },
      {
        code: 'CSV002',
        brand: '기아',
        model: '스포티지',
        name: '기아 스포티지 2024',
        class: 'suv',
        type: 'SUV',
        price: 75000,
        deposit: 150000,
        img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400',
        features: ['파노라마 선루프', '전동 트렁크', 'LED 헤드라이트']
      },
      {
        code: 'CSV003',
        brand: '현대',
        model: '캐스퍼',
        name: '현대 캐스퍼 2024',
        class: 'compact',
        type: '경차',
        price: 35000,
        deposit: 80000,
        img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
        features: ['연비 우수', '주차 편리', '블루투스']
      }
    ];

    for (const v of vehicles) {
      await db.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, vehicle_code, brand, model, year, display_name,
          vehicle_class, vehicle_type, fuel_type, transmission,
          seating_capacity, door_count, large_bags, small_bags,
          daily_rate_krw, deposit_amount_krw,
          thumbnail_url, images, features,
          age_requirement, license_requirement, mileage_limit_per_day,
          unlimited_mileage, smoking_allowed, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        csvVendorId, v.code, v.brand, v.model, 2024, v.name,
        v.class, v.type, 'gasoline', 'automatic',
        5, 4, 3, 2,
        v.price, v.deposit,
        v.img,
        JSON.stringify([v.img.replace('w=400', 'w=800')]),
        JSON.stringify(v.features),
        21, '1년 이상', 200,
        0, 0, 1
      ]);

      console.log(`   ✅ ${v.name} 추가 완료`);
    }

    // CSV 업체의 total_vehicles 업데이트
    await db.execute(`
      UPDATE rentcar_vendors SET total_vehicles = 3 WHERE id = ?
    `, [csvVendorId]);

    console.log('\n4. API 동기화로 차량 추가 테스트...');
    console.log(`   Mock API 서버: http://localhost:3005`);
    console.log(`   동기화 실행...\n`);

    // API 동기화 엔드포인트 호출
    const syncRes = await fetch(`http://localhost:3004/api/admin/rentcar/sync/${apiVendorId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const syncData = await syncRes.json();

    if (syncData.success) {
      console.log(`   ✅ API 동기화 완료!`);
      console.log(`      총 ${syncData.data.total}대 처리`);
      console.log(`      성공: ${syncData.data.success}대`);
      console.log(`      실패: ${syncData.data.failed}대\n`);
    } else {
      console.log(`   ❌ API 동기화 실패: ${syncData.message}\n`);
    }

    console.log('✅ 모든 테스트 데이터 추가 완료!\n');
    console.log('업체 정보:');
    console.log(`  1. 신안 퍼플렌터카 (ID: ${csvVendorId}) - 차량 3대 (CSV)`);
    console.log(`  2. 증도 그린렌터카 (ID: ${apiVendorId}) - 차량 3대 (API)\n`);

    console.log('다음 확인사항:');
    console.log('  - http://localhost:5174/rentcar 접속');
    console.log('  - 렌트카 업체 카드 표시 확인');
    console.log('  - 각 업체 클릭 시 차량 목록 확인');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error(error);
  } finally {
    process.exit(0);
  }
}

executeRentcarTestData();
