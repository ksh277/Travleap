-- ==========================================
-- Travleap (신안 여행 플랫폼) 완전한 데이터베이스 스키마
-- 기반: PlanetScale MySQL
-- ==========================================

-- 1. 사용자 관리
-- ==========================================

-- 사용자 테이블 (회원, 파트너, 관리자)
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
);

-- 로그인 기록
CREATE TABLE login_history (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  login_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT NOT NULL,
  role ENUM('user','partner','admin') DEFAULT 'user',
  ip_address VARCHAR(45),
  user_agent TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_login_date (login_date)
);

-- 2. 카테고리 및 분류 시스템
-- ==========================================

-- 카테고리 테이블
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
);

-- 3. 파트너 관리
-- ==========================================

-- 파트너 테이블
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

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_tier (tier),
  INDEX idx_location (lat, lng)
);

-- 4. 여행 상품 관리
-- ==========================================

-- 메인 상품 테이블 (listings)
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

  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL,
  INDEX idx_category (category_id),
  INDEX idx_partner (partner_id),
  INDEX idx_location (location),
  INDEX idx_price (price_from),
  INDEX idx_rating (rating_avg),
  INDEX idx_published (is_published),
  INDEX idx_featured (featured_score),
  INDEX idx_location_coords (lat, lng)
);

-- 5. 카테고리별 상세 정보 테이블들
-- ==========================================

-- 투어/체험 상품
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
  difficulty_level ENUM('easy','moderate','hard') DEFAULT 'easy',

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 투어 인벤토리 (날짜별 가격/재고 관리)
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

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  UNIQUE KEY unique_listing_date (listing_id, depart_date),
  INDEX idx_depart_date (depart_date)
);

-- 숙박 상품
CREATE TABLE listing_stay (
  listing_id BIGINT PRIMARY KEY,
  stay_type ENUM('hotel','pension','guesthouse','resort','camping') NOT NULL,
  room_types JSON,
  amenities JSON,
  check_in_time TIME DEFAULT '15:00:00',
  check_out_time TIME DEFAULT '11:00:00',
  parking_available BOOLEAN DEFAULT FALSE,
  wifi_available BOOLEAN DEFAULT TRUE,

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 렌터카 상품
CREATE TABLE listing_rentcar (
  listing_id BIGINT PRIMARY KEY,
  brand VARCHAR(50),
  model VARCHAR(50),
  fuel_type ENUM('gasoline','diesel','hybrid','electric') DEFAULT 'gasoline',
  seat_count INT,
  transmission ENUM('auto','manual') DEFAULT 'auto',
  insurance_included BOOLEAN DEFAULT TRUE,
  pickup_location VARCHAR(200),

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 음식점/맛집 상품
CREATE TABLE listing_food (
  listing_id BIGINT PRIMARY KEY,
  cuisine VARCHAR(50),
  specialty_dish VARCHAR(100),
  menu JSON,
  price_level ENUM('low','medium','high') DEFAULT 'medium',
  opening_hours JSON,
  reservation_required BOOLEAN DEFAULT FALSE,

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 관광지/명소 상품
CREATE TABLE listing_attraction (
  listing_id BIGINT PRIMARY KEY,
  attraction_type ENUM('natural','cultural','historical','theme_park') DEFAULT 'natural',
  ticket_info VARCHAR(200),
  opening_hours JSON,
  best_visit_time VARCHAR(100),
  accessibility_info TEXT,

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 이벤트/축제 상품
CREATE TABLE listing_event (
  listing_id BIGINT PRIMARY KEY,
  event_type ENUM('festival','concert','exhibition','workshop','cultural') DEFAULT 'festival',
  organizer VARCHAR(100),
  schedule_json JSON,
  ticket_json JSON,
  venue VARCHAR(200),
  is_recurring BOOLEAN DEFAULT FALSE,

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- 6. 예약 시스템
-- ==========================================

-- 예약 테이블
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
  total_people INT GENERATED ALWAYS AS (num_adults + num_children + num_seniors) STORED,
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

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_listing_id (listing_id),
  INDEX idx_user_id (user_id),
  INDEX idx_booking_number (booking_number),
  INDEX idx_status (status),
  INDEX idx_start_date (start_date),
  INDEX idx_payment_status (payment_status)
);

-- 7. 리뷰 시스템
-- ==========================================

-- 리뷰 테이블
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

  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  INDEX idx_listing_id (listing_id),
  INDEX idx_user_id (user_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
);

-- 8. 장바구니 및 찜하기
-- ==========================================

-- 장바구니
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

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_listing_id (listing_id)
);

-- 찜하기/위시리스트
CREATE TABLE favorites (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  listing_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, listing_id),
  INDEX idx_user_id (user_id),
  INDEX idx_listing_id (listing_id)
);

-- 9. 쿠폰 시스템
-- ==========================================

-- 쿠폰
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

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_code (code),
  INDEX idx_valid_period (valid_from, valid_until),
  INDEX idx_is_active (is_active)
);

-- 사용자 쿠폰 사용 기록
CREATE TABLE user_coupons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  coupon_id BIGINT NOT NULL,
  booking_id BIGINT,
  discount_applied INT,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_coupon_id (coupon_id)
);

-- 10. 사용자 행동 추적
-- ==========================================

-- 사용자 인터랙션
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

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_listing_id (listing_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);

-- 11. 콘텐츠 관리
-- ==========================================

-- 블로그/가이드 포스트
CREATE TABLE blog_posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content_md TEXT,
  excerpt TEXT,
  featured_image VARCHAR(500),
  author_id BIGINT,
  category VARCHAR(50),
  tags JSON,
  view_count INT DEFAULT 0,
  read_time INT, -- minutes
  status ENUM('draft','published','archived') DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_published_at (published_at),
  INDEX idx_category (category)
);

-- 12. 고객 지원
-- ==========================================

-- 문의 접수
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

  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_priority (priority),
  INDEX idx_created_at (created_at)
);

-- 13. 시스템 설정
-- ==========================================

-- 시스템 설정
CREATE TABLE system_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type ENUM('string','number','boolean','json') DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  updated_by BIGINT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_setting_key (setting_key),
  INDEX idx_is_public (is_public)
);

-- ==========================================
-- 초기 데이터 삽입
-- ==========================================

-- 카테고리 초기 데이터
INSERT INTO categories (slug, name_ko, name_en, icon, color_hex, sort_order) VALUES
('tour', '투어/체험', 'Tours & Experiences', 'map', '#FF6B6B', 1),
('stay', '숙박', 'Accommodation', 'bed', '#4ECDC4', 2),
('food', '맛집', 'Restaurants', 'utensils', '#45B7D1', 3),
('attraction', '관광지', 'Attractions', 'camera', '#96CEB4', 4),
('event', '축제/이벤트', 'Events & Festivals', 'calendar', '#FECA57', 5),
('rentcar', '렌터카', 'Car Rental', 'car', '#6C5CE7', 6);

-- 관리자 계정 생성
INSERT INTO users (user_id, email, password_hash, name, role) VALUES
('admin001', 'admin@shinan.com', '$2y$10$example_hash', '관리자', 'admin');

-- 시스템 설정 초기값
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('site_name', 'Travleap', 'string', '사이트 이름', TRUE),
('default_currency', 'KRW', 'string', '기본 통화', TRUE),
('default_language', 'ko', 'string', '기본 언어', TRUE),
('booking_cancel_hours', '24', 'number', '예약 취소 가능 시간', FALSE),
('review_moderation', 'true', 'boolean', '리뷰 검토 필요 여부', FALSE);

-- ==========================================
-- 성능 최적화 인덱스
-- ==========================================

-- 복합 인덱스들
CREATE INDEX idx_listings_search ON listings(is_published, category_id, featured_score, rating_avg);
CREATE INDEX idx_bookings_dashboard ON bookings(user_id, status, created_at);
CREATE INDEX idx_reviews_listing_rating ON reviews(listing_id, rating, created_at);
CREATE INDEX idx_user_interactions_analytics ON user_interactions(listing_id, action, created_at);

-- ==========================================
-- 뷰 생성 (자주 사용하는 쿼리 최적화)
-- ==========================================

-- 인기 상품 뷰
CREATE VIEW popular_listings AS
SELECT
  l.*,
  c.name_ko as category_name,
  p.business_name as partner_name,
  p.tier as partner_tier
FROM listings l
LEFT JOIN categories c ON l.category_id = c.id
LEFT JOIN partners p ON l.partner_id = p.id
WHERE l.is_published = TRUE
ORDER BY l.booking_count DESC, l.rating_avg DESC, l.view_count DESC;

-- 파트너 통계 뷰
CREATE VIEW partner_stats AS
SELECT
  p.*,
  COUNT(l.id) as total_listings,
  COUNT(CASE WHEN l.is_published = TRUE THEN 1 END) as published_listings,
  AVG(l.rating_avg) as avg_rating,
  SUM(l.booking_count) as total_bookings
FROM partners p
LEFT JOIN listings l ON p.id = l.partner_id
GROUP BY p.id;