// PlanetScale에 Phase 1 테이블 생성 스크립트
// PlanetScale은 FOREIGN KEY를 지원하지 않으므로 제거하고 실행

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection(process.env.VITE_DATABASE_URL);

  console.log('✅ PlanetScale 연결 성공');
  console.log('');

  try {
    // 1. rentcar_vendors 테이블
    console.log('📦 [1/4] rentcar_vendors 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_vendors (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        vendor_code VARCHAR(50) UNIQUE NOT NULL COMMENT '업체 코드',
        business_name VARCHAR(200) NOT NULL COMMENT '사업자명',
        brand_name VARCHAR(100) COMMENT '브랜드명',
        business_number VARCHAR(50) UNIQUE COMMENT '사업자등록번호',
        contact_name VARCHAR(100) NOT NULL COMMENT '담당자명',
        contact_email VARCHAR(100) NOT NULL COMMENT '이메일',
        contact_phone VARCHAR(50) NOT NULL COMMENT '전화번호',
        description TEXT COMMENT '업체 소개',
        logo_url VARCHAR(500) COMMENT '로고 URL',
        status ENUM('pending', 'active', 'suspended') DEFAULT 'pending' COMMENT '승인 상태',
        is_verified BOOLEAN DEFAULT FALSE COMMENT '인증 여부',
        commission_rate DECIMAL(5,2) DEFAULT 15.00 COMMENT '수수료율',
        total_vehicles INT DEFAULT 0 COMMENT '총 차량 수',
        total_bookings INT DEFAULT 0 COMMENT '총 예약 수',
        average_rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '평균 평점',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vendor_code (vendor_code),
        INDEX idx_status (status),
        INDEX idx_verified (is_verified)
      ) COMMENT='렌트카 업체 마스터' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ rentcar_vendors 테이블 생성 완료');
    console.log('');

    // 2. rentcar_locations 테이블
    console.log('📦 [2/4] rentcar_locations 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_locations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        vendor_id BIGINT NOT NULL COMMENT '업체 ID',
        location_code VARCHAR(50) NOT NULL COMMENT '지점 코드',
        name VARCHAR(200) NOT NULL COMMENT '지점명',
        location_type ENUM('airport', 'downtown', 'station', 'hotel') DEFAULT 'downtown',
        address VARCHAR(500) NOT NULL COMMENT '주소',
        city VARCHAR(100) COMMENT '도시',
        postal_code VARCHAR(20) COMMENT '우편번호',
        lat DECIMAL(10,7) COMMENT '위도',
        lng DECIMAL(10,7) COMMENT '경도',
        operating_hours JSON COMMENT '영업시간',
        phone VARCHAR(50) COMMENT '전화번호',
        pickup_fee_krw INT DEFAULT 0 COMMENT '픽업 수수료',
        dropoff_fee_krw INT DEFAULT 0 COMMENT '반납 수수료',
        is_active BOOLEAN DEFAULT TRUE COMMENT '활성 여부',
        display_order INT DEFAULT 0 COMMENT '표시 순서',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vendor_location (vendor_id, location_code),
        INDEX idx_vendor_active (vendor_id, is_active),
        INDEX idx_location_type (location_type),
        INDEX idx_coordinates (lat, lng)
      ) COMMENT='렌트카 픽업/반납 지점' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ rentcar_locations 테이블 생성 완료');
    console.log('');

    // 3. rentcar_vehicles 테이블
    console.log('📦 [3/4] rentcar_vehicles 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_vehicles (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        vendor_id BIGINT NOT NULL COMMENT '업체 ID',
        vehicle_code VARCHAR(50) NOT NULL COMMENT '차량 코드',
        brand VARCHAR(50) NOT NULL COMMENT '제조사',
        model VARCHAR(100) NOT NULL COMMENT '모델명',
        year INT NOT NULL COMMENT '연식',
        display_name VARCHAR(200) NOT NULL COMMENT '표시명',
        vehicle_class ENUM('compact', 'midsize', 'fullsize', 'luxury', 'suv', 'van', 'electric') NOT NULL COMMENT '차급',
        vehicle_type VARCHAR(50) COMMENT '타입',
        fuel_type ENUM('gasoline', 'diesel', 'electric', 'hybrid') NOT NULL COMMENT '연료',
        transmission ENUM('manual', 'automatic') DEFAULT 'automatic' COMMENT '변속기',
        seating_capacity INT NOT NULL DEFAULT 5 COMMENT '탑승 인원',
        door_count INT DEFAULT 4 COMMENT '도어 수',
        large_bags INT DEFAULT 2 COMMENT '대형 수하물',
        small_bags INT DEFAULT 2 COMMENT '소형 수하물',
        thumbnail_url VARCHAR(500) COMMENT '썸네일',
        images JSON COMMENT '이미지 배열',
        features JSON COMMENT '기본 장비',
        age_requirement INT DEFAULT 21 COMMENT '최소 나이',
        license_requirement TEXT COMMENT '면허 요구사항',
        mileage_limit_per_day INT DEFAULT 200 COMMENT '일일 주행거리 제한',
        unlimited_mileage BOOLEAN DEFAULT FALSE COMMENT '무제한 주행',
        deposit_amount_krw INT DEFAULT 0 COMMENT '보증금',
        smoking_allowed BOOLEAN DEFAULT FALSE COMMENT '흡연 가능',
        daily_rate_krw INT NOT NULL COMMENT '일일 기본 요금',
        is_active BOOLEAN DEFAULT TRUE COMMENT '활성 여부',
        is_featured BOOLEAN DEFAULT FALSE COMMENT '추천 차량',
        total_bookings INT DEFAULT 0 COMMENT '총 예약 수',
        average_rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '평균 평점',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vendor_vehicle (vendor_id, vehicle_code),
        INDEX idx_vendor_active (vendor_id, is_active),
        INDEX idx_class_fuel (vehicle_class, fuel_type),
        INDEX idx_brand_model (brand, model),
        INDEX idx_price (daily_rate_krw)
      ) COMMENT='렌트카 차량 정보' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ rentcar_vehicles 테이블 생성 완료');
    console.log('');

    // 4. rentcar_bookings 테이블
    console.log('📦 [4/4] rentcar_bookings 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_bookings (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        booking_number VARCHAR(50) UNIQUE NOT NULL COMMENT '예약 번호',
        vendor_id BIGINT NOT NULL,
        vehicle_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL COMMENT '사용자 ID',
        customer_name VARCHAR(100) NOT NULL COMMENT '고객명',
        customer_email VARCHAR(100) NOT NULL COMMENT '이메일',
        customer_phone VARCHAR(50) NOT NULL COMMENT '전화번호',
        pickup_location_id BIGINT NOT NULL COMMENT '픽업 지점',
        dropoff_location_id BIGINT NOT NULL COMMENT '반납 지점',
        pickup_date DATE NOT NULL COMMENT '픽업 날짜',
        pickup_time TIME NOT NULL COMMENT '픽업 시간',
        dropoff_date DATE NOT NULL COMMENT '반납 날짜',
        dropoff_time TIME NOT NULL COMMENT '반납 시간',
        daily_rate_krw INT NOT NULL COMMENT '일일 요금',
        rental_days INT NOT NULL COMMENT '대여 일수',
        subtotal_krw INT NOT NULL COMMENT '소계',
        insurance_krw INT DEFAULT 0 COMMENT '보험료',
        extras_krw INT DEFAULT 0 COMMENT '추가 옵션',
        tax_krw INT DEFAULT 0 COMMENT '세금',
        discount_krw INT DEFAULT 0 COMMENT '할인',
        total_krw INT NOT NULL COMMENT '총 금액',
        status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
        special_requests TEXT COMMENT '특별 요청사항',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vendor_status (vendor_id, status),
        INDEX idx_user (user_id),
        INDEX idx_pickup_date (pickup_date),
        INDEX idx_status (status, payment_status)
      ) COMMENT='렌트카 예약' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ rentcar_bookings 테이블 생성 완료');
    console.log('');

    // 샘플 데이터 삽입
    console.log('📊 샘플 데이터 삽입 중...');

    // 벤더 데이터
    await connection.execute(`
      INSERT INTO rentcar_vendors (vendor_code, business_name, brand_name, business_number, contact_name, contact_email, contact_phone, description, status, is_verified, commission_rate) VALUES
      ('JEJU_RENT_01', '제주렌트카', '제주렌트카', '123-45-67890', '김제주', 'jeju@rent.com', '064-123-4567', '제주도 최대 렌트카 업체', 'active', TRUE, 10.00),
      ('SHINAN_RENT_01', '신안렌트카', '신안렌트카', '987-65-43210', '박신안', 'shinan@rent.com', '061-234-5678', '신안군 전문 렌트카', 'active', TRUE, 12.00)
      ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP
    `);

    // 지점 데이터
    await connection.execute(`
      INSERT INTO rentcar_locations (vendor_id, location_code, name, location_type, address, city, lat, lng, phone, is_active) VALUES
      (1, 'JEJU_AIRPORT', '제주공항점', 'airport', '제주특별자치도 제주시 공항로 2', '제주시', 33.5067, 126.4933, '064-123-4567', TRUE),
      (1, 'JEJU_DOWNTOWN', '제주시내점', 'downtown', '제주특별자치도 제주시 중앙로 100', '제주시', 33.5000, 126.5000, '064-123-4568', TRUE),
      (2, 'SHINAN_MAIN', '신안본점', 'downtown', '전라남도 신안군 지도읍 지도로 1', '신안군', 34.8167, 126.2333, '061-234-5678', TRUE)
      ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP
    `);

    // 차량 데이터
    await connection.execute(`
      INSERT INTO rentcar_vehicles (vendor_id, vehicle_code, brand, model, year, display_name, vehicle_class, vehicle_type, fuel_type, transmission, seating_capacity, door_count, large_bags, small_bags, features, age_requirement, mileage_limit_per_day, deposit_amount_krw, daily_rate_krw, is_active, is_featured) VALUES
      (1, 'AVANTE_2024_001', '현대', '아반떼', 2024, '현대 아반떼 2024', 'compact', '세단', 'gasoline', 'automatic', 5, 4, 2, 2, '["네비게이션", "후방카메라", "블루투스"]', 21, 200, 300000, 50000, TRUE, TRUE),
      (1, 'SONATA_2024_001', '현대', '소나타', 2024, '현대 소나타 2024', 'midsize', '세단', 'gasoline', 'automatic', 5, 4, 3, 2, '["네비게이션", "후방카메라", "크루즈컨트롤", "스마트키"]', 23, 200, 500000, 70000, TRUE, FALSE),
      (1, 'KONA_EV_2024_001', '현대', '코나 EV', 2024, '현대 코나 일렉트릭 2024', 'electric', 'SUV', 'electric', 'automatic', 5, 4, 2, 2, '["네비게이션", "급속충전", "후방카메라"]', 25, 0, 500000, 80000, TRUE, TRUE),
      (2, 'K5_2024_001', '기아', 'K5', 2024, '기아 K5 2024', 'midsize', '세단', 'gasoline', 'automatic', 5, 4, 3, 2, '["네비게이션", "어라운드뷰", "하이패스"]', 23, 200, 500000, 75000, TRUE, FALSE)
      ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP
    `);

    console.log('✅ 샘플 데이터 삽입 완료');
    console.log('');
    console.log('🎉 Phase 1 데이터베이스 구축 완료!');
    console.log('');
    console.log('생성된 테이블:');
    console.log('  - rentcar_vendors (벤더 2개)');
    console.log('  - rentcar_locations (지점 3개)');
    console.log('  - rentcar_vehicles (차량 4개)');
    console.log('  - rentcar_bookings (예약 테이블)');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

main();
