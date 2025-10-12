/**
 * 빠른 렌트카 업체 계정 생성 스크립트
 *
 * 사용 방법:
 * node database/quick-vendor-create.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function createVendorAccount() {
  console.log('🚗 렌트카 업체 계정 생성 시작...\n');

  // DB 연결
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // 1. 사용자 계정 생성
    console.log('📝 1단계: 사용자 계정 생성...');
    const [userResult] = await connection.execute(`
      INSERT INTO users (
        user_id, email, password_hash, name, phone, role,
        preferred_language, preferred_currency, marketing_consent,
        is_active, email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      `vendor_${Date.now()}`,
      'rentcar@test.com',
      'hashed_test123',  // 비밀번호: test123
      '신안렌트카',
      '010-1234-5678',
      'vendor',
      'ko',
      'KRW',
      false,
      true,
      true
    ]);

    const userId = userResult.insertId;
    console.log(`✅ 사용자 계정 생성 완료! User ID: ${userId}`);

    // 2. 업체 정보 생성
    console.log('\n📝 2단계: 업체 정보 생성...');
    const [vendorResult] = await connection.execute(`
      INSERT INTO rentcar_vendors (
        name, business_registration_number, contact_email, contact_phone,
        contact_person, address, description, operating_hours,
        supported_languages, is_active, is_verified, vehicle_count,
        user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      '신안렌트카',
      '123-45-67890',
      'rentcar@test.com',
      '010-1234-5678',
      '홍길동',
      '전라남도 신안군 압해읍',
      '신안 지역 최고의 렌트카 서비스',
      '09:00-18:00',
      JSON.stringify(['ko']),
      true,
      true,
      0,
      userId
    ]);

    const vendorId = vendorResult.insertId;
    console.log(`✅ 업체 정보 생성 완료! Vendor ID: ${vendorId}`);

    // 3. 테스트 차량 등록
    console.log('\n📝 3단계: 테스트 차량 등록...');

    const vehicles = [
      {
        name: 'K5 2023년형',
        class: '중형',
        manufacturer: '기아',
        model: 'K5',
        year: 2023,
        seats: 5,
        transmission: '자동',
        fuel: '휘발유',
        rate: 80000
      },
      {
        name: '쏘나타 2024년형',
        class: '중형',
        manufacturer: '현대',
        model: '쏘나타',
        year: 2024,
        seats: 5,
        transmission: '자동',
        fuel: '하이브리드',
        rate: 85000
      },
      {
        name: '카니발 2023년형',
        class: '승합',
        manufacturer: '기아',
        model: '카니발',
        year: 2023,
        seats: 11,
        transmission: '자동',
        fuel: '경유',
        rate: 120000
      }
    ];

    for (const vehicle of vehicles) {
      await connection.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, vehicle_class, display_name, manufacturer, model_name,
          model_year, seating_capacity, transmission_type, fuel_type,
          daily_rate_krw, weekly_rate_krw, monthly_rate_krw,
          deposit_amount_krw, mileage_limit_km, extra_mileage_fee_krw,
          min_driver_age, min_license_years, vehicle_features, images,
          vehicle_description, is_available, is_featured,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorId,
        vehicle.class,
        vehicle.name,
        vehicle.manufacturer,
        vehicle.model,
        vehicle.year,
        vehicle.seats,
        vehicle.transmission,
        vehicle.fuel,
        vehicle.rate,
        vehicle.rate * 6,
        vehicle.rate * 22,
        200000,
        200,
        200,
        21,
        1,
        JSON.stringify(['스마트키', '후방카메라', '블루투스', '내비게이션']),
        JSON.stringify(['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800']),
        `${vehicle.name} - ${vehicle.class} ${vehicle.fuel} ${vehicle.transmission}`,
        true,
        false
      ]);
      console.log(`   ✅ ${vehicle.name} 등록 완료`);
    }

    // 4. 차량 수 업데이트
    await connection.execute(`
      UPDATE rentcar_vendors SET vehicle_count = ? WHERE id = ?
    `, [vehicles.length, vendorId]);

    // 완료 메시지
    console.log('\n' + '='.repeat(60));
    console.log('✅ 렌트카 업체 테스트 계정 생성 완료!');
    console.log('='.repeat(60));
    console.log('\n📧 로그인 정보:');
    console.log('   이메일: rentcar@test.com');
    console.log('   비밀번호: test123');
    console.log('   역할: 렌트카 업체 (vendor)');
    console.log('\n🏢 업체 정보:');
    console.log(`   업체명: 신안렌트카`);
    console.log(`   Vendor ID: ${vendorId}`);
    console.log(`   User ID: ${userId}`);
    console.log('\n🚗 등록된 차량: 3대');
    console.log('   1. K5 2023년형 (중형 세단)');
    console.log('   2. 쏘나타 2024년형 (하이브리드)');
    console.log('   3. 카니발 2023년형 (11인승)');
    console.log('\n🔗 접속 URL:');
    console.log('   로그인: http://localhost:5173/login');
    console.log('   대시보드: http://localhost:5173/vendor/dashboard');
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 실행
createVendorAccount()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
