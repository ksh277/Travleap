/**
 * 테스트용 벤더 계정 2개 생성
 * 1. 숙박 파트너 (partner 계정 + 객실 데이터)
 * 2. 렌트카 벤더 (vendor 계정 + 차량 데이터)
 */

const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('\n' + '='.repeat(80));
console.log('👥 테스트 벤더 계정 생성');
console.log('='.repeat(80));

async function createTestVendors() {
  const conn = connect({ url: process.env.DATABASE_URL });

  try {
    // ========== 1. 숙박 파트너 계정 생성 ==========
    console.log('\n1️⃣  숙박 파트너 계정 생성');
    console.log('-'.repeat(80));

    // 1-1. User 계정 생성
    const hashedPassword = await bcrypt.hash('test1234', 10);

    const lodgingUser = await conn.execute(`
      INSERT INTO users (user_id, email, password_hash, name, phone, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      'LODGING-TEST-001',
      'lodging@test.com',
      hashedPassword,
      '테스트 숙박업체',
      '010-1111-2222',
      'partner',
      'active'
    ]);

    const lodgingUserId = lodgingUser.insertId;
    console.log('✅ 숙박 User 계정 생성:', lodgingUserId);

    // 1-2. Partner 등록
    const partner = await conn.execute(`
      INSERT INTO partners (
        user_id, business_name, contact_name, email, phone,
        business_number, description, tier, is_verified, is_active, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      lodgingUserId,
      '테스트 호텔 & 리조트',
      '김호텔',
      'lodging@test.com',
      '010-1111-2222',
      '123-45-67890',
      '신안군 최고의 오션뷰 호텔입니다. PMS 연동 테스트용 호텔입니다.',
      'gold',
      1,
      1,
      'approved'
    ]);

    const partnerId = partner.insertId;
    console.log('✅ Partner 등록:', partnerId);

    // 1-3. 객실 4개 추가
    console.log('\n📋 객실 추가 중...');

    const rooms = [
      {
        title: '스탠다드 더블룸',
        short_description: '아늑한 더블 침대가 있는 스탠다드룸',
        description: '편안한 더블 침대와 바다 전망을 즐길 수 있는 스탠다드 객실입니다.',
        price: 89000,
        spots: 5,
        amenities: ['WiFi', '에어컨', 'TV', '미니바', '헤어드라이어']
      },
      {
        title: '디럭스 트윈룸',
        short_description: '넓은 공간의 트윈 침대 객실',
        description: '2개의 싱글 침대가 있는 넓은 객실입니다. 가족 여행객에게 적합합니다.',
        price: 119000,
        spots: 4,
        amenities: ['WiFi', '에어컨', 'TV', '미니바', '헤어드라이어', '욕조']
      },
      {
        title: '프리미엄 스위트',
        short_description: '최고급 스위트룸, 오션뷰',
        description: '넓은 거실과 침실이 분리된 프리미엄 스위트룸입니다. 탁트인 바다 전망을 자랑합니다.',
        price: 199000,
        spots: 3,
        amenities: ['WiFi', '에어컨', 'TV', '미니바', '헤어드라이어', '욕조', '커피머신', '발코니']
      },
      {
        title: '패밀리 룸',
        short_description: '4인 가족을 위한 넓은 객실',
        description: '더블 침대 1개와 싱글 침대 2개가 있는 패밀리룸입니다.',
        price: 159000,
        spots: 6,
        amenities: ['WiFi', '에어컨', 'TV', '미니바', '헤어드라이어', '냉장고', '전자레인지']
      }
    ];

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const images = JSON.stringify([
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
      ]);
      const amenities = JSON.stringify(room.amenities);
      const highlights = JSON.stringify(['오션뷰', '무료 WiFi', '조식 포함']);

      await conn.execute(`
        INSERT INTO listings (
          partner_id, category_id, title, short_description, description_md,
          images, price_from, price_to, location, amenities, highlights,
          available_spots, rating_avg, rating_count, is_featured, is_published, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        partnerId,
        1857, // 숙박 카테고리
        room.title,
        room.short_description,
        room.description,
        images,
        room.price,
        room.price + 20000,
        '전남 신안군 증도면',
        amenities,
        highlights,
        room.spots,
        4.5,
        12,
        i === 2 ? 1 : 0, // 프리미엄 스위트만 featured
        1,
        1
      ]);

      console.log(`   ${i + 1}. ${room.title} - ₩${room.price.toLocaleString()}`);
    }

    console.log(`\n✅ 숙박 파트너 완료!`);
    console.log(`   계정: lodging@test.com / test1234`);
    console.log(`   Partner ID: ${partnerId}`);
    console.log(`   객실: 4개`);

    // ========== 2. 렌트카 벤더 계정 생성 ==========
    console.log('\n2️⃣  렌트카 벤더 계정 생성');
    console.log('-'.repeat(80));

    // 2-1. User 계정 생성
    const rentcarUser = await conn.execute(`
      INSERT INTO users (user_id, email, password_hash, name, phone, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      'RENTCAR-TEST-001',
      'rentcar@test.com',
      hashedPassword,
      '테스트 렌트카',
      '010-3333-4444',
      'vendor',
      'active'
    ]);

    const rentcarUserId = rentcarUser.insertId;
    console.log('✅ 렌트카 User 계정 생성:', rentcarUserId);

    // 2-2. Vendor 등록
    const vendor = await conn.execute(`
      INSERT INTO rentcar_vendors (
        user_id, vendor_code, business_name, brand_name, contact_name, contact_email, contact_phone,
        description, business_number, status, is_verified, commission_rate,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      rentcarUserId,
      'TEST-RENT-002',
      '테스트 렌터카 신안점',
      '테스트렌트',
      '박렌트',
      'rentcar@test.com',
      '010-3333-4444',
      'PMS 연동 테스트용 렌트카 업체입니다. 다양한 차량을 보유하고 있습니다.',
      '111-22-33445',
      'active',
      1,
      12.0
    ]);

    const vendorId = vendor.insertId;
    console.log('✅ Vendor 등록:', vendorId);

    // 2-3. 차량 5대 추가
    console.log('\n🚗 차량 추가 중...');

    const vehicles = [
      {
        class: 'Compact',
        brand: '현대',
        model: '아반떼',
        year: 2024,
        display_name: '2024 현대 아반떼 (최신형)',
        transmission: 'Automatic',
        fuel: 'Gasoline',
        seats: 5,
        rate: 55000
      },
      {
        class: 'SUV',
        brand: '기아',
        model: '스포티지',
        year: 2024,
        display_name: '2024 기아 스포티지 (패밀리 추천)',
        transmission: 'Automatic',
        fuel: 'Gasoline',
        seats: 5,
        rate: 85000
      },
      {
        class: 'Electric',
        brand: '현대',
        model: '아이오닉5',
        year: 2024,
        display_name: '2024 현대 아이오닉5 (전기차)',
        transmission: 'Automatic',
        fuel: 'Electric',
        seats: 5,
        rate: 95000
      },
      {
        class: 'Luxury',
        brand: '제네시스',
        model: 'G80',
        year: 2024,
        display_name: '2024 제네시스 G80 (럭셔리)',
        transmission: 'Automatic',
        fuel: 'Gasoline',
        seats: 5,
        rate: 150000
      },
      {
        class: 'Van',
        brand: '기아',
        model: '카니발',
        year: 2023,
        display_name: '2023 기아 카니발 (9인승 대형)',
        transmission: 'Automatic',
        fuel: 'Diesel',
        seats: 9,
        rate: 120000
      }
    ];

    for (let i = 0; i < vehicles.length; i++) {
      const car = vehicles[i];
      const images = JSON.stringify([
        `https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800`,
        `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800`
      ]);
      const features = JSON.stringify(['네비게이션', '후방카메라', '블루투스', '스마트키']);

      await conn.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, vehicle_class, brand, model, year, display_name,
          transmission, fuel_type, seating_capacity, large_bags, small_bags,
          daily_rate_krw, images, features, is_active, is_featured,
          average_rating, total_bookings, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorId,
        car.class,
        car.brand,
        car.model,
        car.year,
        car.display_name,
        car.transmission,
        car.fuel,
        car.seats,
        2,
        1,
        car.rate,
        images,
        features,
        1,
        i === 2 ? 1 : 0, // 아이오닉5만 featured
        4.3,
        8
      ]);

      console.log(`   ${i + 1}. ${car.display_name} - ₩${car.rate.toLocaleString()}/일`);
    }

    console.log(`\n✅ 렌트카 벤더 완료!`);
    console.log(`   계정: rentcar@test.com / test1234`);
    console.log(`   Vendor ID: ${vendorId}`);
    console.log(`   차량: 5대`);

    // ========== 최종 요약 ==========
    console.log('\n' + '='.repeat(80));
    console.log('📊 생성 완료 요약');
    console.log('='.repeat(80));

    console.log('\n1️⃣  숙박 파트너 (Partner)');
    console.log('   📧 이메일: lodging@test.com');
    console.log('   🔑 비밀번호: test1234');
    console.log('   🏨 업체명: 테스트 호텔 & 리조트');
    console.log(`   🆔 Partner ID: ${partnerId}`);
    console.log('   🛏️  객실: 4개 (스탠다드/디럭스/프리미엄/패밀리)');
    console.log(`   🔗 URL: /accommodation/${partnerId}`);

    console.log('\n2️⃣  렌트카 벤더 (Vendor)');
    console.log('   📧 이메일: rentcar@test.com');
    console.log('   🔑 비밀번호: test1234');
    console.log('   🚗 업체명: 테스트 렌터카 신안점');
    console.log(`   🆔 Vendor ID: ${vendorId}`);
    console.log('   🚙 차량: 5대 (아반떼/스포티지/아이오닉5/G80/카니발)');
    console.log(`   🔗 URL: /rentcar/${vendorId}`);

    console.log('\n🧪 테스트 플로우:');
    console.log('   1. 메인 페이지 → 주변 숙소에서 "테스트 호텔" 확인');
    console.log('   2. /category/stay → 호텔 카드 클릭');
    console.log(`   3. /accommodation/${partnerId} → 객실 4개 확인`);
    console.log('   4. 객실 선택 → /detail/{id} → 예약/결제');
    console.log('   5. /category/rentcar → 렌트카 카드 클릭');
    console.log(`   6. /rentcar/${vendorId} → 차량 5대 확인`);
    console.log('   7. 차량 선택 → 예약/결제');

    console.log('\n✅ 완료! 이제 전체 예약 플로우를 테스트할 수 있습니다!\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);

    // 이미 존재하는 계정인 경우
    if (error.message.includes('Duplicate entry')) {
      console.log('\n⚠️  계정이 이미 존재합니다.');
      console.log('   기존 계정을 사용하거나, 이메일을 변경해주세요.');
    }
  }
}

createTestVendors();
