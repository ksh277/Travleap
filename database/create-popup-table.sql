-- ============================================
-- 팝업 전용 테이블 생성
-- ============================================
-- 문제: 팝업 카테고리가 listings 테이블에 의존하여 전용 기능 부족
-- 해결: popups 전용 테이블 생성 및 popup_orders 주문 테이블 생성
-- ============================================

-- 1. 팝업 테이블 생성
CREATE TABLE IF NOT EXISTS popups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL COMMENT '벤더 ID (users 테이블 참조)',

  -- 기본 정보
  brand_name VARCHAR(200) NOT NULL COMMENT '브랜드명',
  popup_name VARCHAR(200) NOT NULL COMMENT '팝업 이름',
  description TEXT COMMENT '팝업 설명',
  category VARCHAR(100) DEFAULT '팝업' COMMENT '카테고리 (팝업, 전시, 체험 등)',

  -- 위치 정보
  location_name VARCHAR(200) COMMENT '장소명 (예: 홍대 팝업스토어)',
  address VARCHAR(500) COMMENT '주소',
  latitude DECIMAL(10, 8) COMMENT '위도',
  longitude DECIMAL(11, 8) COMMENT '경도',

  -- 운영 정보
  start_date DATE NOT NULL COMMENT '시작일',
  end_date DATE NOT NULL COMMENT '종료일',
  operating_hours VARCHAR(200) COMMENT '운영 시간 (예: 평일 10:00-20:00)',

  -- 가격 정보
  entrance_fee INT DEFAULT 0 COMMENT '입장료 (원)',
  is_free BOOLEAN DEFAULT FALSE COMMENT '무료 입장 여부',

  -- 미디어
  image_url VARCHAR(500) COMMENT '대표 이미지 URL',
  gallery_images JSON COMMENT '갤러리 이미지 배열 (JSON)',

  -- 예약 정보
  requires_reservation BOOLEAN DEFAULT FALSE COMMENT '예약 필요 여부',
  max_capacity INT COMMENT '최대 수용 인원 (일일)',
  booking_url VARCHAR(500) COMMENT '외부 예약 링크',

  -- 상태
  is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
  status VARCHAR(50) DEFAULT 'upcoming' COMMENT '상태 (upcoming, ongoing, ended)',

  -- 태그/키워드
  tags JSON COMMENT '태그 배열 (JSON) - 예: ["포토존", "굿즈", "한정판"]',

  -- 추가 정보
  sns_instagram VARCHAR(200) COMMENT '인스타그램 계정',
  sns_website VARCHAR(500) COMMENT '웹사이트 URL',
  parking_info TEXT COMMENT '주차 정보',
  nearby_subway VARCHAR(200) COMMENT '인근 지하철역',

  -- 메타데이터
  view_count INT DEFAULT 0 COMMENT '조회수',
  like_count INT DEFAULT 0 COMMENT '좋아요 수',

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',

  -- 인덱스
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_location (location_name),
  INDEX idx_status (status, is_active),
  INDEX idx_created_at (created_at),

  -- 외래키 (optional - users 테이블과 연결)
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='팝업 스토어/전시 테이블';

-- 2. 팝업 주문 테이블 생성
CREATE TABLE IF NOT EXISTS popup_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '주문번호 (POPUP_YYYYMMDDHHMMSS_XXXX)',

  -- 연결 정보
  popup_id INT NOT NULL COMMENT '팝업 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',

  -- 방문 정보
  visit_date DATE NOT NULL COMMENT '방문 예정일',
  visit_time VARCHAR(20) COMMENT '방문 시간대 (예: 14:00-15:00)',
  visitor_count INT DEFAULT 1 COMMENT '방문 인원',

  -- 고객 정보
  customer_name VARCHAR(100) NOT NULL COMMENT '예약자명',
  customer_phone VARCHAR(20) NOT NULL COMMENT '연락처',
  customer_email VARCHAR(200) COMMENT '이메일',

  -- 결제 정보
  total_amount INT NOT NULL COMMENT '총 결제 금액',
  payment_status VARCHAR(50) DEFAULT 'pending' COMMENT '결제 상태',
  payment_method VARCHAR(50) COMMENT '결제 수단',
  payment_key VARCHAR(200) COMMENT 'Toss 결제 키',
  paid_at TIMESTAMP NULL COMMENT '결제 완료 시각',

  -- 주문 상태
  order_status VARCHAR(50) DEFAULT 'pending' COMMENT '주문 상태 (pending, confirmed, completed, canceled)',

  -- 환불 정보
  refunded_at TIMESTAMP NULL COMMENT '환불 완료 시각',
  refund_amount INT COMMENT '환불 금액',
  cancel_reason TEXT COMMENT '취소 사유',
  canceled_at TIMESTAMP NULL COMMENT '취소 시각',

  -- 추가 정보
  special_requests TEXT COMMENT '특이사항/요청사항',
  notes JSON COMMENT '추가 데이터 (JSON)',

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '주문 생성일',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',

  -- 인덱스
  INDEX idx_order_number (order_number),
  INDEX idx_popup_id (popup_id),
  INDEX idx_user_id (user_id),
  INDEX idx_visit_date (visit_date),
  INDEX idx_payment_key (payment_key),
  INDEX idx_payment_status (payment_status),
  INDEX idx_order_status (order_status),
  INDEX idx_created_at (created_at),

  -- 외래키
  FOREIGN KEY (popup_id) REFERENCES popups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='팝업 주문/예약 테이블';

-- 3. 샘플 데이터 삽입 (선택사항)
-- INSERT INTO popups (vendor_id, brand_name, popup_name, description, location_name, address, start_date, end_date, entrance_fee, is_active, status)
-- VALUES
-- (1, '브랜드A', '신안 브랜드A 팝업', '신안군 특산물을 활용한 팝업 스토어', '신안군청 앞', '전라남도 신안군 압해읍', '2025-02-01', '2025-03-31', 0, TRUE, 'upcoming'),
-- (1, '브랜드B', '천사대교 전망 팝업', '천사대교를 배경으로 한 포토존 팝업', '천사대교 전망대', '전라남도 신안군 임자면', '2025-03-01', '2025-04-30', 5000, TRUE, 'upcoming');

-- 4. 확인: 테이블 구조 출력
DESCRIBE popups;
DESCRIBE popup_orders;

-- ============================================
-- 사용 예시
-- ============================================

-- 1. 팝업 등록
-- INSERT INTO popups (vendor_id, brand_name, popup_name, description, location_name, address, start_date, end_date, entrance_fee, is_active, status)
-- VALUES (1, '신안 소금 팝업', '천일염 체험 팝업', '신안 천일염을 직접 체험할 수 있는 팝업', '신안군청', '전라남도 신안군 압해읍', '2025-02-15', '2025-03-15', 0, TRUE, 'upcoming');

-- 2. 팝업 주문 생성
-- INSERT INTO popup_orders (order_number, popup_id, user_id, visit_date, visitor_count, customer_name, customer_phone, total_amount, payment_status, order_status)
-- VALUES ('POPUP_20250115120000_0001', 1, 1, '2025-02-20', 2, '홍길동', '010-1234-5678', 10000, 'pending', 'pending');

-- 3. 현재 진행중인 팝업 조회
-- SELECT * FROM popups
-- WHERE is_active = TRUE
--   AND start_date <= CURDATE()
--   AND end_date >= CURDATE()
-- ORDER BY created_at DESC;

-- 4. 특정 벤더의 팝업 주문 조회
-- SELECT
--   po.*,
--   p.brand_name,
--   p.popup_name,
--   p.location_name
-- FROM popup_orders po
-- JOIN popups p ON po.popup_id = p.id
-- WHERE p.vendor_id = 1
-- ORDER BY po.created_at DESC
-- LIMIT 50;

-- ============================================
-- 완료
-- ============================================
SELECT '팝업 테이블 생성 완료' AS status;
