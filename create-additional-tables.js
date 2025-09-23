import { connect } from '@planetscale/database';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  url: process.env.VITE_PLANETSCALE_HOST?.replace(/'/g, '') || '',
  username: process.env.VITE_PLANETSCALE_USERNAME || '',
  password: process.env.VITE_PLANETSCALE_PASSWORD || ''
};

async function createAdditionalTables() {
  console.log('=== 추가 테이블 생성 (결제 시스템 + 카테고리별 상세) ===\n');

  try {
    const conn = connect(config);

    // ===== 1단계: 결제 시스템 테이블들 =====
    console.log('📦 1단계: 결제 시스템 테이블 생성 중...\n');

    // 1. payments (결제 내역)
    console.log('1. payments 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE payments (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        booking_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        payment_method ENUM('card', 'bank_transfer', 'kakaopay', 'naverpay', 'samsung_pay') NOT NULL,
        payment_gateway VARCHAR(50),
        gateway_transaction_id VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
        payment_date TIMESTAMP NULL,
        payment_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_payment_date (payment_date),
        INDEX idx_gateway_transaction (gateway_transaction_id)
      )
    `);
    console.log('✅ payments 테이블 생성 완료');

    // 2. refunds (환불 내역)
    console.log('2. refunds 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE refunds (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        payment_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        refund_amount DECIMAL(10, 2) NOT NULL,
        refund_reason TEXT,
        status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
        admin_notes TEXT,
        processed_by BIGINT,
        refund_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payment_id (payment_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_refund_date (refund_date)
      )
    `);
    console.log('✅ refunds 테이블 생성 완료');

    // 3. partner_settlements (파트너 정산)
    console.log('3. partner_settlements 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE partner_settlements (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        partner_id BIGINT NOT NULL,
        booking_id BIGINT NOT NULL,
        payment_id BIGINT NOT NULL,
        gross_amount DECIMAL(10, 2) NOT NULL,
        commission_rate DECIMAL(5, 2) NOT NULL,
        commission_amount DECIMAL(10, 2) NOT NULL,
        net_amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'paid', 'held') DEFAULT 'pending',
        settlement_date TIMESTAMP NULL,
        bank_info JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_partner_id (partner_id),
        INDEX idx_booking_id (booking_id),
        INDEX idx_payment_id (payment_id),
        INDEX idx_status (status),
        INDEX idx_settlement_date (settlement_date)
      )
    `);
    console.log('✅ partner_settlements 테이블 생성 완료');

    // ===== 2단계: 카테고리별 상세 테이블들 =====
    console.log('\n🏨 2단계: 카테고리별 상세 테이블 생성 중...\n');

    // 4. listing_accommodation (숙박 상세)
    console.log('4. listing_accommodation 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE listing_accommodation (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        listing_id BIGINT NOT NULL,
        room_type VARCHAR(100),
        max_guests INT DEFAULT 2,
        check_in_time TIME DEFAULT '15:00:00',
        check_out_time TIME DEFAULT '11:00:00',
        amenities JSON,
        bed_type VARCHAR(50),
        bathroom_type VARCHAR(50),
        room_size DECIMAL(5, 2),
        wifi_available BOOLEAN DEFAULT TRUE,
        parking_available BOOLEAN DEFAULT FALSE,
        breakfast_included BOOLEAN DEFAULT FALSE,
        cancellation_policy TEXT,
        house_rules TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing_id (listing_id),
        INDEX idx_max_guests (max_guests),
        INDEX idx_room_type (room_type)
      )
    `);
    console.log('✅ listing_accommodation 테이블 생성 완료');

    // 5. listing_food (음식점 상세)
    console.log('5. listing_food 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE listing_food (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        listing_id BIGINT NOT NULL,
        cuisine_type VARCHAR(100),
        opening_hours JSON,
        menu_items JSON,
        price_range ENUM('budget', 'mid_range', 'expensive') DEFAULT 'mid_range',
        reservations_required BOOLEAN DEFAULT FALSE,
        parking_available BOOLEAN DEFAULT FALSE,
        seating_capacity INT,
        delivery_available BOOLEAN DEFAULT FALSE,
        takeout_available BOOLEAN DEFAULT TRUE,
        alcohol_served BOOLEAN DEFAULT FALSE,
        kid_friendly BOOLEAN DEFAULT TRUE,
        specialty_dishes TEXT,
        chef_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing_id (listing_id),
        INDEX idx_cuisine_type (cuisine_type),
        INDEX idx_price_range (price_range)
      )
    `);
    console.log('✅ listing_food 테이블 생성 완료');

    // 6. listing_rentcar (렌터카 상세)
    console.log('6. listing_rentcar 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE listing_rentcar (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        listing_id BIGINT NOT NULL,
        vehicle_type VARCHAR(100),
        brand VARCHAR(50),
        model VARCHAR(100),
        year_manufactured INT,
        fuel_type ENUM('gasoline', 'diesel', 'electric', 'hybrid') DEFAULT 'gasoline',
        seating_capacity INT DEFAULT 5,
        transmission ENUM('manual', 'automatic') DEFAULT 'automatic',
        features JSON,
        insurance_included BOOLEAN DEFAULT TRUE,
        insurance_details TEXT,
        mileage_limit INT,
        deposit_amount DECIMAL(10, 2),
        pickup_location VARCHAR(255),
        return_location VARCHAR(255),
        age_requirement INT DEFAULT 21,
        license_requirement TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing_id (listing_id),
        INDEX idx_vehicle_type (vehicle_type),
        INDEX idx_seating_capacity (seating_capacity),
        INDEX idx_fuel_type (fuel_type)
      )
    `);
    console.log('✅ listing_rentcar 테이블 생성 완료');

    // 7. listing_event (이벤트/행사 상세)
    console.log('7. listing_event 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE listing_event (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        listing_id BIGINT NOT NULL,
        event_type VARCHAR(100),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        event_times JSON,
        ticket_types JSON,
        venue_info TEXT,
        venue_address VARCHAR(500),
        organizer VARCHAR(255),
        age_restriction VARCHAR(50),
        dress_code VARCHAR(100),
        language VARCHAR(50) DEFAULT 'Korean',
        accessibility_info TEXT,
        refund_policy TEXT,
        contact_info JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing_id (listing_id),
        INDEX idx_event_type (event_type),
        INDEX idx_dates (start_date, end_date),
        INDEX idx_organizer (organizer)
      )
    `);
    console.log('✅ listing_event 테이블 생성 완료');

    // ===== 3단계: 핵심 기능 테이블들 =====
    console.log('\n🔔 3단계: 핵심 기능 테이블 생성 중...\n');

    // 8. notifications (알림 시스템)
    console.log('8. notifications 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE notifications (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        type ENUM('booking_confirmed', 'payment_completed', 'payment_failed', 'review_request', 'partner_approved', 'refund_completed', 'system_update', 'promotion') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        action_url VARCHAR(500),
        metadata JSON,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at),
        INDEX idx_expires_at (expires_at)
      )
    `);
    console.log('✅ notifications 테이블 생성 완료');

    // 9. partner_applications (파트너 신청)
    console.log('9. partner_applications 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE partner_applications (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        business_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        business_number VARCHAR(50),
        business_address TEXT,
        categories JSON NOT NULL,
        description TEXT NOT NULL,
        services TEXT,
        website VARCHAR(500),
        instagram VARCHAR(500),
        facebook VARCHAR(500),
        expected_revenue DECIMAL(12, 2),
        years_in_business INT,
        status ENUM('pending', 'approved', 'rejected', 'under_review') DEFAULT 'pending',
        admin_notes TEXT,
        reviewed_by BIGINT,
        reviewed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_email (email),
        INDEX idx_reviewed_by (reviewed_by),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ partner_applications 테이블 생성 완료');

    // 10. file_uploads (파일 관리)
    console.log('10. file_uploads 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE file_uploads (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        entity_type ENUM('listing', 'partner', 'user', 'review', 'partner_application') NOT NULL,
        entity_id BIGINT NOT NULL,
        file_type ENUM('image', 'document', 'video') NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_url VARCHAR(500),
        file_size INT NOT NULL,
        mime_type VARCHAR(100),
        is_primary BOOLEAN DEFAULT FALSE,
        alt_text VARCHAR(255),
        uploaded_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_file_type (file_type),
        INDEX idx_uploaded_by (uploaded_by),
        INDEX idx_is_primary (is_primary)
      )
    `);
    console.log('✅ file_uploads 테이블 생성 완료');

    // ===== 4단계: 고급 기능 테이블들 =====
    console.log('\n🎯 4단계: 고급 기능 테이블 생성 중...\n');

    // 11. search_logs (검색 로그)
    console.log('11. search_logs 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE search_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT,
        search_query VARCHAR(500) NOT NULL,
        search_filters JSON,
        results_count INT DEFAULT 0,
        clicked_item_id BIGINT,
        session_id VARCHAR(100),
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_search_query (search_query),
        INDEX idx_clicked_item_id (clicked_item_id),
        INDEX idx_created_at (created_at),
        INDEX idx_session_id (session_id)
      )
    `);
    console.log('✅ search_logs 테이블 생성 완료');

    // 12. user_coupons (사용자 쿠폰 사용 기록)
    console.log('12. user_coupons 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE user_coupons (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        coupon_id BIGINT NOT NULL,
        booking_id BIGINT,
        discount_applied DECIMAL(10, 2),
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_coupon_id (coupon_id),
        INDEX idx_booking_id (booking_id),
        INDEX idx_used_at (used_at),
        UNIQUE KEY unique_user_coupon_booking (user_id, coupon_id, booking_id)
      )
    `);
    console.log('✅ user_coupons 테이블 생성 완료');

    // 13. login_history (로그인 기록)
    console.log('13. login_history 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE login_history (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        login_type ENUM('email', 'google', 'kakao', 'naver') DEFAULT 'email',
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_type ENUM('desktop', 'mobile', 'tablet') DEFAULT 'desktop',
        location_info JSON,
        login_status ENUM('success', 'failed', 'blocked') DEFAULT 'success',
        logout_at TIMESTAMP NULL,
        session_duration INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_login_status (login_status),
        INDEX idx_created_at (created_at),
        INDEX idx_ip_address (ip_address)
      )
    `);
    console.log('✅ login_history 테이블 생성 완료');

    // ===== 초기 샘플 데이터 삽입 =====
    console.log('\n📄 샘플 데이터 삽입 중...\n');

    // 숙박 상세 정보 샘플
    await conn.execute(`
      INSERT INTO listing_accommodation (listing_id, room_type, max_guests, amenities, bed_type, wifi_available, parking_available, breakfast_included) VALUES
      (3, '바다뷰 스탠다드룸', 4, '["ocean_view", "wifi", "parking", "kitchen", "air_conditioning"]', '더블베드 2개', TRUE, TRUE, FALSE)
    `);

    // 음식점 상세 정보 샘플
    await conn.execute(`
      INSERT INTO listing_food (listing_id, cuisine_type, opening_hours, price_range, specialty_dishes, kid_friendly) VALUES
      (5, '해산물 전문점', '{"monday": "09:00-21:00", "tuesday": "09:00-21:00", "wednesday": "09:00-21:00", "thursday": "09:00-21:00", "friday": "09:00-22:00", "saturday": "09:00-22:00", "sunday": "09:00-21:00"}', 'mid_range', '신안 특산 젓갈, 전복죽, 바지락칼국수', TRUE)
    `);

    // 투어 상세 정보에 염전 체험 추가
    await conn.execute(`
      UPDATE listing_tour SET
        included_md = '- 전문 가이드 동행\\n- 체험 도구 제공\\n- 천일염 1kg 기념품\\n- 염전 역사 설명\\n- 사진 촬영 서비스',
        excluded_md = '- 개인 용품 (모자, 선크림)\\n- 식사 및 음료\\n- 교통비',
        what_to_bring_md = '- 편한 신발 (운동화 권장)\\n- 모자 및 선크림\\n- 물\\n- 카메라',
        age_policy_md = '- 만 5세 이상 참여 가능\\n- 12세 미만은 보호자 동반 필수\\n- 임산부는 참여 불가'
      WHERE listing_id = 1
    `);

    // 샘플 알림 데이터
    await conn.execute(`
      INSERT INTO notifications (user_id, type, title, message, action_url) VALUES
      (2, 'booking_confirmed', '예약이 확정되었습니다', '신안 천일염 체험 예약이 확정되었습니다. 즐거운 여행 되세요!', '/my-bookings'),
      (3, 'review_request', '리뷰를 작성해주세요', '증도 슬로시티 투어는 어떠셨나요? 다른 여행자들을 위해 후기를 남겨주세요.', '/write-review/2')
    `);

    // 샘플 파트너 신청 데이터
    await conn.execute(`
      INSERT INTO partner_applications (business_name, contact_name, email, phone, categories, description, services, status) VALUES
      ('신안 바다펜션', '김바다', 'ocean@pension.com', '010-1111-2222', '["accommodation"]', '신안 앞바다가 한눈에 보이는 아늑한 펜션을 운영하고 있습니다.', '숙박, 바베큐장 제공, 낚시체험', 'pending'),
      ('흑산도 어촌체험마을', '이어부', 'fisher@village.com', '010-3333-4444', '["tour", "food"]', '흑산도 전통 어업 체험과 신선한 해산물 요리를 제공합니다.', '어업체험, 해산물 식당, 민박', 'under_review')
    `);

    console.log('✅ 샘플 데이터 삽입 완료');

    // ===== 최종 테이블 목록 확인 =====
    console.log('\n=== 최종 테이블 목록 ===');
    const finalTables = await conn.execute('SHOW TABLES');
    finalTables.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${Object.values(row)[0]}`);
    });

    console.log(`\n🎉 총 ${finalTables.rows.length}개의 테이블 완성!`);

    // 데이터 현황 확인
    console.log('\n=== 최종 데이터 현황 ===');
    const stats = [
      { table: 'users', name: '👥 사용자' },
      { table: 'partners', name: '🤝 파트너' },
      { table: 'listings', name: '🏝️ 여행 상품' },
      { table: 'bookings', name: '📅 예약' },
      { table: 'reviews', name: '⭐ 리뷰' },
      { table: 'payments', name: '💳 결제' },
      { table: 'notifications', name: '🔔 알림' },
      { table: 'partner_applications', name: '📝 파트너 신청' }
    ];

    for (const stat of stats) {
      const result = await conn.execute(`SELECT COUNT(*) as count FROM ${stat.table}`);
      console.log(`${stat.name}: ${result.rows[0].count}개`);
    }

    console.log('\n✅ 신안 여행 플랫폼 완전한 데이터베이스 구축 완료! 🚀');
    console.log('🎯 이제 모든 페이지의 기능을 완벽하게 지원할 수 있습니다.');

  } catch (error) {
    console.error('❌ 추가 테이블 생성 실패:', error);
  }
}

createAdditionalTables();