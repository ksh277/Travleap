-- 예약 테이블 생성 (알림톡 자동 발송)
-- 결제 없이 날짜/시간 예약만 하는 시스템

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE NOT NULL COMMENT '예약 번호 (RES-timestamp-random)',

  -- 가맹점 정보
  vendor_id INT NOT NULL COMMENT '가맹점 ID',
  category ENUM('hotel', 'restaurant', 'attraction', 'experience', 'event', 'rentcar') NOT NULL COMMENT '카테고리',
  vendor_name VARCHAR(200) COMMENT '가맹점 이름',
  service_name VARCHAR(200) COMMENT '서비스/상품 이름',

  -- 예약 날짜/시간
  reservation_date DATE NOT NULL COMMENT '예약 날짜',
  reservation_time TIME NULL COMMENT '예약 시간 (선택사항)',
  end_date DATE NULL COMMENT '종료 날짜 (숙박 등)',

  -- 인원
  party_size INT DEFAULT 1 COMMENT '총 인원',
  num_adults INT DEFAULT 1 COMMENT '성인 수',
  num_children INT DEFAULT 0 COMMENT '어린이 수',

  -- 예약자 정보
  customer_name VARCHAR(100) NOT NULL COMMENT '예약자명',
  customer_phone VARCHAR(20) NOT NULL COMMENT '연락처',
  customer_email VARCHAR(200) COMMENT '이메일',

  -- 요청사항
  special_requests TEXT COMMENT '특별 요청사항',

  -- 상태 관리
  status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending' COMMENT '예약 상태',

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 인덱스
  INDEX idx_vendor (vendor_id),
  INDEX idx_customer_phone (customer_phone),
  INDEX idx_reservation_date (reservation_date),
  INDEX idx_status (status),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='가맹점 예약 테이블 (알림톡 자동 발송)';
