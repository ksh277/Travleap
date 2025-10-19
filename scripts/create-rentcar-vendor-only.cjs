/**
 * 렌트카 벤더만 생성 (숙박은 이미 생성됨)
 */

const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createRentcarVendor() {
  const conn = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n🚗 렌트카 벤더 생성 중...\n');

    // User 계정 생성
    const hashedPassword = await bcrypt.hash('test1234', 10);

    const rentcarUser = await conn.execute(`
      INSERT INTO users (user_id, email, password_hash, name, phone, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      `RENTCAR-TEST-${Date.now()}`,
      `rentcar${Date.now()}@test.com`,
      hashedPassword,
      '테스트 렌터카',
      '010-3333-4444',
      'vendor',
      'active'
    ]);

    const rentcarUserId = rentcarUser.insertId;
    console.log('✅ 렌트카 User 계정 생성:', rentcarUserId);

    // Vendor 등록
    const vendor = await conn.execute(`
      INSERT INTO rentcar_vendors (
        vendor_code, business_name, brand_name, contact_name, contact_email, contact_phone,
        description, business_number, status, is_verified, commission_rate,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      `TEST-RENT-${Date.now()}`,
      '테스트 렌터카 신안점',
      '테스트렌트',
      '박렌트',
      `rentcar${Date.now()}@test.com`,
      '010-3333-4444',
      'PMS 연동 테스트용 렌트카 업체입니다.',
      `${Date.now()}`,
      'active',
      1,
      12.0
    ]);

    const vendorId = vendor.insertId;
    console.log('✅ Vendor 등록:', vendorId);

    // 차량 5대 추가
    console.log('\n🚗 차량 추가 중...');

    const vehicles = [
      { class: 'Compact', brand: '현대', model: '아반떼', year: 2024, display_name: '2024 현대 아반떼', transmission: 'Automatic', fuel: 'Gasoline', seats: 5, rate: 55000 },
      { class: 'SUV', brand: '기아', model: '스포티지', year: 2024, display_name: '2024 기아 스포티지', transmission: 'Automatic', fuel: 'Gasoline', seats: 5, rate: 85000 },
      { class: 'Electric', brand: '현대', model: '아이오닉5', year: 2024, display_name: '2024 현대 아이오닉5 (전기차)', transmission: 'Automatic', fuel: 'Electric', seats: 5, rate: 95000 },
      { class: 'Luxury', brand: '제네시스', model: 'G80', year: 2024, display_name: '2024 제네시스 G80', transmission: 'Automatic', fuel: 'Gasoline', seats: 5, rate: 150000 },
      { class: 'Van', brand: '기아', model: '카니발', year: 2023, display_name: '2023 기아 카니발 (9인승)', transmission: 'Automatic', fuel: 'Diesel', seats: 9, rate: 120000 }
    ];

    for (let i = 0; i < vehicles.length; i++) {
      const car = vehicles[i];
      const images = JSON.stringify(['https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800']);
      const features = JSON.stringify(['네비게이션', '후방카메라', '블루투스']);

      const vehicleCode = `VEH-${vendorId}-${String(i + 1).padStart(3, '0')}`;

      await conn.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, vehicle_code, vehicle_class, brand, model, year, display_name,
          transmission, fuel_type, seating_capacity, large_bags, small_bags,
          daily_rate_krw, images, features, is_active, is_featured,
          average_rating, total_bookings, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorId, vehicleCode, car.class, car.brand, car.model, car.year, car.display_name,
        car.transmission, car.fuel, car.seats, 2, 1,
        car.rate, images, features, 1, i === 2 ? 1 : 0, 4.3, 8
      ]);

      console.log(`   ${i + 1}. ${car.display_name} - ₩${car.rate.toLocaleString()}/일`);
    }

    console.log(`\n✅ 렌트카 벤더 생성 완료!`);
    console.log(`   Vendor ID: ${vendorId}`);
    console.log(`   URL: /rentcar/${vendorId}\n`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

createRentcarVendor();
