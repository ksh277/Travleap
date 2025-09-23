import { connect } from '@planetscale/database';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  url: process.env.VITE_PLANETSCALE_HOST?.replace(/'/g, '') || '',
  username: process.env.VITE_PLANETSCALE_USERNAME || '',
  password: process.env.VITE_PLANETSCALE_PASSWORD || ''
};

async function createTablesForPlanetScale() {
  console.log('=== 신안 여행 플랫폼 데이터베이스 테이블 생성 (PlanetScale 최적화) ===\n');

  try {
    const conn = connect(config);

    // 1. 사용자 테이블
    console.log('1. 사용자 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(30) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        birth_date DATE,
        bio TEXT,
        avatar VARCHAR(500),
        role ENUM('user','partner','admin') DEFAULT 'user',
        preferred_language VARCHAR(10) DEFAULT 'ko',
        preferred_currency VARCHAR(10) DEFAULT 'KRW',
        marketing_consent BOOLEAN DEFAULT FALSE,
        notification_settings JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_user_id (user_id),
        INDEX idx_role (role)
      )
    `);
    console.log('✅ users 테이블 생성 완료');

    // 2. 카테고리 테이블
    console.log('2. 카테고리 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        slug VARCHAR(50) NOT NULL UNIQUE,
        name_ko VARCHAR(50) NOT NULL,
        name_en VARCHAR(50),
        icon VARCHAR(50),
        color_hex VARCHAR(7),
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_slug (slug),
        INDEX idx_sort_order (sort_order)
      )
    `);
    console.log('✅ categories 테이블 생성 완료');

    // 3. 파트너 테이블
    console.log('3. 파트너 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE partners (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        business_name VARCHAR(100) NOT NULL,
        contact_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(50),
        business_number VARCHAR(50),
        website VARCHAR(500),
        instagram VARCHAR(500),
        description TEXT,
        services TEXT,
        tier ENUM('bronze','silver','gold','vip') DEFAULT 'bronze',
        is_verified BOOLEAN DEFAULT FALSE,
        is_featured BOOLEAN DEFAULT FALSE,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        lat DECIMAL(10,7),
        lng DECIMAL(10,7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_tier (tier),
        INDEX idx_location (lat, lng)
      )
    `);
    console.log('✅ partners 테이블 생성 완료');

    // 4. 상품 테이블
    console.log('4. 상품 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE listings (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        category_id INT NOT NULL,
        partner_id BIGINT,
        title VARCHAR(200) NOT NULL,
        description_md TEXT,
        short_description VARCHAR(500),
        price_from INT,
        price_to INT,
        currency VARCHAR(10) DEFAULT 'KRW',
        images JSON,
        lat DECIMAL(10,7),
        lng DECIMAL(10,7),
        location VARCHAR(255),
        duration VARCHAR(100),
        max_capacity INT,
        min_capacity INT DEFAULT 1,
        rating_avg DECIMAL(3,2) DEFAULT 0,
        rating_count INT DEFAULT 0,
        view_count INT DEFAULT 0,
        booking_count INT DEFAULT 0,
        start_date DATE,
        end_date DATE,
        is_published BOOLEAN DEFAULT FALSE,
        featured_score INT DEFAULT 0,
        partner_boost INT DEFAULT 0,
        sponsored_until DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category_id),
        INDEX idx_partner (partner_id),
        INDEX idx_location (location),
        INDEX idx_price (price_from),
        INDEX idx_rating (rating_avg),
        INDEX idx_published (is_published),
        INDEX idx_featured (featured_score),
        INDEX idx_location_coords (lat, lng)
      )
    `);
    console.log('✅ listings 테이블 생성 완료');

    // 5. 예약 테이블
    console.log('5. 예약 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE bookings (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        booking_number VARCHAR(50) NOT NULL UNIQUE,
        listing_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        start_date DATE,
        end_date DATE,
        check_in_time TIME,
        check_out_time TIME,
        num_adults INT DEFAULT 1,
        num_children INT DEFAULT 0,
        num_seniors INT DEFAULT 0,
        price_adult INT,
        price_child INT,
        price_senior INT,
        subtotal INT,
        discount_amount INT DEFAULT 0,
        tax_amount INT DEFAULT 0,
        total_amount INT,
        payment_method ENUM('card','bank_transfer','kakao_pay','naver_pay') DEFAULT 'card',
        payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
        status ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
        customer_info JSON,
        special_requests TEXT,
        cancellation_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing_id (listing_id),
        INDEX idx_user_id (user_id),
        INDEX idx_booking_number (booking_number),
        INDEX idx_status (status),
        INDEX idx_start_date (start_date),
        INDEX idx_payment_status (payment_status)
      )
    `);
    console.log('✅ bookings 테이블 생성 완료');

    // 6. 리뷰 테이블
    console.log('6. 리뷰 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE reviews (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        listing_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        booking_id BIGINT,
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title VARCHAR(200),
        comment_md TEXT,
        pros TEXT,
        cons TEXT,
        visit_date DATE,
        helpful_count INT DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        admin_reply TEXT,
        admin_reply_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing_id (listing_id),
        INDEX idx_user_id (user_id),
        INDEX idx_rating (rating),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ reviews 테이블 생성 완료');

    // 7. 장바구니 테이블
    console.log('7. 장바구니 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE cart_items (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        listing_id BIGINT NOT NULL,
        selected_date DATE,
        num_adults INT DEFAULT 1,
        num_children INT DEFAULT 0,
        num_seniors INT DEFAULT 0,
        price_snapshot INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_listing_id (listing_id)
      )
    `);
    console.log('✅ cart_items 테이블 생성 완료');

    // 8. 찜하기 테이블
    console.log('8. 찜하기 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE favorites (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        listing_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_favorite (user_id, listing_id),
        INDEX idx_user_id (user_id),
        INDEX idx_listing_id (listing_id)
      )
    `);
    console.log('✅ favorites 테이블 생성 완료');

    // 9. 투어 상세 테이블
    console.log('9. 투어 상세 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE listing_tour (
        listing_id BIGINT PRIMARY KEY,
        tour_type ENUM('day','activity','package','city','experience','cruise','salt_experience') NOT NULL,
        duration_hours INT,
        meeting_point VARCHAR(200),
        meeting_lat DECIMAL(10,7),
        meeting_lng DECIMAL(10,7),
        included_md TEXT,
        excluded_md TEXT,
        what_to_bring_md TEXT,
        age_policy_md TEXT,
        cancel_policy_md TEXT,
        difficulty_level ENUM('easy','moderate','hard') DEFAULT 'easy'
      )
    `);
    console.log('✅ listing_tour 테이블 생성 완료');

    // 10. 투어 인벤토리 테이블
    console.log('10. 투어 인벤토리 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE listing_tour_inventory (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        listing_id BIGINT NOT NULL,
        depart_date DATE NOT NULL,
        price_adult INT NOT NULL,
        price_child INT,
        price_senior INT,
        capacity_total INT NOT NULL,
        capacity_sold INT DEFAULT 0,
        cutoff_hours INT DEFAULT 24,
        is_available BOOLEAN DEFAULT TRUE,
        UNIQUE KEY unique_listing_date (listing_id, depart_date),
        INDEX idx_depart_date (depart_date),
        INDEX idx_listing_id (listing_id)
      )
    `);
    console.log('✅ listing_tour_inventory 테이블 생성 완료');

    // 11. 문의 테이블
    console.log('11. 문의 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE contact_submissions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        subject VARCHAR(255),
        message TEXT NOT NULL,
        category ENUM('general','booking','technical','partnership','complaint') DEFAULT 'general',
        priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
        status ENUM('new','in_progress','resolved','closed') DEFAULT 'new',
        assigned_to BIGINT,
        response TEXT,
        responded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_category (category),
        INDEX idx_priority (priority),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ contact_submissions 테이블 생성 완료');

    // 12. 쿠폰 테이블
    console.log('12. 쿠폰 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE coupons (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        discount_type ENUM('percentage','fixed','free_shipping') NOT NULL,
        discount_value INT NOT NULL,
        min_amount INT DEFAULT 0,
        max_discount_amount INT,
        usage_limit INT,
        usage_per_user INT DEFAULT 1,
        used_count INT DEFAULT 0,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        applicable_categories JSON,
        applicable_partners JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_valid_period (valid_from, valid_until),
        INDEX idx_is_active (is_active)
      )
    `);
    console.log('✅ coupons 테이블 생성 완료');

    // 13. 사용자 행동 추적 테이블
    console.log('13. 사용자 행동 추적 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE user_interactions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT,
        listing_id BIGINT,
        action ENUM('view','click','book','share','favorite','review') NOT NULL,
        session_id VARCHAR(100),
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_listing_id (listing_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ user_interactions 테이블 생성 완료');

    // 초기 데이터 삽입
    console.log('\n=== 초기 데이터 삽입 ===');

    // 카테고리 초기 데이터
    await conn.execute(`
      INSERT INTO categories (slug, name_ko, name_en, icon, color_hex, sort_order) VALUES
      ('tour', '투어/체험', 'Tours & Experiences', 'map', '#FF6B6B', 1),
      ('stay', '숙박', 'Accommodation', 'bed', '#4ECDC4', 2),
      ('food', '맛집', 'Restaurants', 'utensils', '#45B7D1', 3),
      ('attraction', '관광지', 'Attractions', 'camera', '#96CEB4', 4),
      ('event', '축제/이벤트', 'Events & Festivals', 'calendar', '#FECA57', 5),
      ('rentcar', '렌터카', 'Car Rental', 'car', '#6C5CE7', 6)
    `);
    console.log('✅ 카테고리 초기 데이터 삽입 완료');

    // 관리자 계정 생성
    await conn.execute(`
      INSERT INTO users (user_id, email, password_hash, name, role) VALUES
      ('admin001', 'admin@shinan.com', '$2y$10$example_hash', '관리자', 'admin')
    `);
    console.log('✅ 관리자 계정 생성 완료');

    // 샘플 여행 상품 데이터
    await conn.execute(`
      INSERT INTO listings (category_id, title, description_md, price_from, location, rating_avg, duration, max_capacity, images, is_published) VALUES
      (1, '신안 천일염 체험', '전통적인 천일염 제조 과정을 직접 체험해보세요', 25000, '신안군 증도면', 4.8, '2시간', 20, '["https://via.placeholder.com/400x300"]', TRUE),
      (1, '증도 슬로시티 투어', '유네스코 생물권보전지역 증도의 아름다운 자연을 만나보세요', 35000, '신안군 증도면', 4.6, '4시간', 15, '["https://via.placeholder.com/400x300"]', TRUE),
      (2, '신안 펜션 바다뷰', '바다가 한눈에 보이는 아늑한 펜션에서 힐링하세요', 120000, '신안군 자은도', 4.7, '1박', 6, '["https://via.placeholder.com/400x300"]', TRUE),
      (1, '흑산도 등대 트레킹', '흑산도의 상징인 등대까지 트레킹하며 절경을 감상하세요', 30000, '신안군 흑산면', 4.5, '3시간', 12, '["https://via.placeholder.com/400x300"]', TRUE),
      (3, '신안 특산물 투어', '신안의 대표 특산물을 직접 보고 맛보는 투어', 40000, '신안군 전역', 4.9, '5시간', 10, '["https://via.placeholder.com/400x300"]', TRUE)
    `);
    console.log('✅ 샘플 여행 상품 데이터 삽입 완료');

    // 샘플 리뷰 데이터
    await conn.execute(`
      INSERT INTO reviews (listing_id, user_id, rating, title, comment_md, pros, cons, visit_date) VALUES
      (1, 1, 5, '정말 좋은 체험이었어요!', '천일염 만드는 과정을 직접 볼 수 있어서 아이들이 너무 좋아했습니다.', '가이드 설명이 자세함, 체험이 재미있음', '날씨가 덥다', '2024-08-15'),
      (2, 1, 4, '자연이 아름다운 곳', '증도의 자연 경관이 정말 멋있었습니다. 힐링이 되었어요.', '경치가 아름다움, 가이드가 친절함', '이동시간이 조금 김', '2024-08-10'),
      (3, 1, 5, '바다뷰가 환상적!', '펜션에서 보는 바다 전망이 정말 좋았습니다.', '뷰가 좋음, 시설이 깨끗함', '주변에 편의시설이 적음', '2024-07-20')
    `);
    console.log('✅ 샘플 리뷰 데이터 삽입 완료');

    // 최종 테이블 목록 확인
    console.log('\n=== 생성된 테이블 목록 ===');
    const tables = await conn.execute('SHOW TABLES');
    tables.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${Object.values(row)[0]}`);
    });

    console.log(`\n🎉 총 ${tables.rows.length}개의 테이블이 생성되었습니다!`);
    console.log('✅ 신안 여행 플랫폼 데이터베이스 설정 완료!');

    // 데이터 확인
    console.log('\n=== 생성된 데이터 확인 ===');
    const categoriesCount = await conn.execute('SELECT COUNT(*) as count FROM categories');
    const listingsCount = await conn.execute('SELECT COUNT(*) as count FROM listings');
    const reviewsCount = await conn.execute('SELECT COUNT(*) as count FROM reviews');

    console.log(`📊 카테고리: ${categoriesCount.rows[0].count}개`);
    console.log(`📊 여행 상품: ${listingsCount.rows[0].count}개`);
    console.log(`📊 리뷰: ${reviewsCount.rows[0].count}개`);

  } catch (error) {
    console.error('❌ 데이터베이스 생성 실패:', error);
  }
}

createTablesForPlanetScale();