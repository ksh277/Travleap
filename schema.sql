-- Travleap Database Schema for PlanetScale

-- Users table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Travel items table
CREATE TABLE travel_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  images JSON,
  location VARCHAR(255),
  rating DECIMAL(3, 2) DEFAULT 0,
  duration VARCHAR(100),
  max_capacity INT,
  amenities JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_location (location),
  INDEX idx_price (price),
  INDEX idx_rating (rating)
);

-- Bookings table
CREATE TABLE bookings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  item_id VARCHAR(36) NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guest_count INT NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  customer_info JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES travel_items(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_item_id (item_id),
  INDEX idx_status (status),
  INDEX idx_check_in_date (check_in_date)
);

-- Reviews table
CREATE TABLE reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36),
  item_id VARCHAR(36) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  author VARCHAR(255) DEFAULT '익명',
  helpful INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (item_id) REFERENCES travel_items(id) ON DELETE CASCADE,
  INDEX idx_item_id (item_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
);

-- Contact submissions table
CREATE TABLE contact_submissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('new', 'read', 'responded') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Cart items table (for temporary storage)
CREATE TABLE cart_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36),
  item_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  selected_date DATE,
  guest_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES travel_items(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_item_id (item_id)
);

-- Sample data insertion
INSERT INTO travel_items (name, description, category, price, images, location, rating, duration, max_capacity, amenities) VALUES
('신안 천일염 체험', '전통적인 천일염 제조 과정을 직접 체험해보세요', 'experience', 25000, '["https://via.placeholder.com/400x300"]', '신안군 증도면', 4.8, '2시간', 20, '["가이드 동행", "체험도구 제공", "기념품"]'),
('증도 슬로시티 투어', '유네스코 생물권보전지역 증도의 아름다운 자연을 만나보세요', 'tour', 35000, '["https://via.placeholder.com/400x300"]', '신안군 증도면', 4.6, '4시간', 15, '["전문 가이드", "점심 포함", "교통편"]'),
('신안 펜션 바다뷰', '바다가 한눈에 보이는 아늑한 펜션에서 힐링하세요', 'accommodation', 120000, '["https://via.placeholder.com/400x300"]', '신안군 자은도', 4.7, '1박', 6, '["바다뷰", "주방시설", "주차장", "와이파이"]'),
('흑산도 등대 트레킹', '흑산도의 상징인 등대까지 트레킹하며 절경을 감상하세요', 'activity', 30000, '["https://via.placeholder.com/400x300"]', '신안군 흑산면', 4.5, '3시간', 12, '["전문 가이드", "안전장비", "간식 제공"]'),
('신안 특산물 투어', '신안의 대표 특산물을 직접 보고 맛보는 투어', 'food', 40000, '["https://via.placeholder.com/400x300"]', '신안군 전역', 4.9, '5시간', 10, '["시식", "구매 할인", "가이드 동행", "교통편"]');

INSERT INTO users (email, name, phone, is_admin) VALUES
('admin@shinan.com', '관리자', '010-1234-5678', TRUE),
('user1@example.com', '김신안', '010-2345-6789', FALSE),
('user2@example.com', '이여행', '010-3456-7890', FALSE);