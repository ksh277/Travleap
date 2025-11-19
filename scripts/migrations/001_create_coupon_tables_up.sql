-- ========================================
-- 마이그레이션: 001 - 스마트 쿠폰 테이블 생성 (UP)
-- ========================================
-- 실행 순서: 외래키 의존성 고려하여 순차 생성
-- ========================================

-- 1. campaigns (캠페인) - 다른 테이블이 참조하므로 먼저 생성
CREATE TABLE IF NOT EXISTS campaigns (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '캠페인 ID',
  name VARCHAR(255) NOT NULL COMMENT '캠페인 이름',
  campaign_code VARCHAR(50) UNIQUE NOT NULL COMMENT '캠페인 코드',
  description TEXT COMMENT '캠페인 설명',
  public_qr_url VARCHAR(500) COMMENT '공용 QR URL',
  public_qr_image TEXT COMMENT 'Base64 QR 이미지',
  valid_from DATETIME NOT NULL COMMENT '캠페인 시작일시',
  valid_to DATETIME NOT NULL COMMENT '캠페인 종료일시',
  status ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED') DEFAULT 'DRAFT' COMMENT '캠페인 상태',
  max_issuance INT DEFAULT NULL COMMENT '최대 발급 수량',
  total_issued INT DEFAULT 0 COMMENT '총 발급된 쿠폰 수',
  total_used INT DEFAULT 0 COMMENT '총 사용된 쿠폰 수',
  created_by BIGINT COMMENT '생성한 관리자 ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campaign_code (campaign_code),
  INDEX idx_status (status),
  INDEX idx_valid_dates (valid_from, valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='쿠폰 캠페인';

-- 2. user_coupons (사용자 쿠폰) - campaigns 참조
CREATE TABLE IF NOT EXISTS user_coupons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '사용자 쿠폰 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID',
  campaign_id BIGINT NOT NULL COMMENT '캠페인 ID',
  coupon_code VARCHAR(50) UNIQUE NOT NULL COMMENT '개인 쿠폰 코드',
  qr_url VARCHAR(500) COMMENT '개인 QR URL',
  qr_image TEXT COMMENT 'Base64 QR 이미지',
  status ENUM('ACTIVE', 'USED', 'EXPIRED', 'REVOKED') DEFAULT 'ACTIVE' COMMENT '쿠폰 상태',
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '발급 일시',
  expires_at TIMESTAMP NULL COMMENT '만료 일시',
  used_at TIMESTAMP NULL COMMENT '사용 일시',
  used_merchant_id BIGINT NULL COMMENT '사용된 가맹점 ID',
  used_partner_id BIGINT NULL COMMENT '승인한 파트너 ID',
  usage_log_id BIGINT NULL COMMENT '사용 로그 ID',
  review_submitted BOOLEAN DEFAULT FALSE COMMENT '리뷰 작성 여부',
  review_points_awarded INT DEFAULT 0 COMMENT '지급된 리뷰 포인트',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_campaign (user_id, campaign_id) COMMENT '1인 1캠페인 1쿠폰',
  INDEX idx_coupon_code (coupon_code),
  INDEX idx_user_id (user_id),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_status (status),
  INDEX idx_used_merchant (used_merchant_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='사용자별 쿠폰';

-- 3. campaign_merchants (캠페인 가맹점) - campaigns 참조
CREATE TABLE IF NOT EXISTS campaign_merchants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_id BIGINT NOT NULL COMMENT '캠페인 ID',
  merchant_id BIGINT NOT NULL COMMENT '가맹점 ID',
  merchant_name VARCHAR(255) NOT NULL COMMENT '가맹점 이름',
  merchant_category VARCHAR(100) COMMENT '가맹점 카테고리',
  discount_type ENUM('PERCENT', 'AMOUNT') NOT NULL COMMENT '할인 타입',
  discount_value DECIMAL(10,2) NOT NULL COMMENT '할인 값',
  max_discount_amount DECIMAL(10,2) NULL COMMENT '최대 할인 금액',
  min_order_amount DECIMAL(10,2) DEFAULT 0 COMMENT '최소 주문 금액',
  is_active BOOLEAN DEFAULT TRUE COMMENT '가맹점 활성화 여부',
  total_usage_count INT DEFAULT 0 COMMENT '총 사용 횟수',
  total_discount_amount DECIMAL(12,2) DEFAULT 0 COMMENT '총 할인 금액',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_campaign_merchant (campaign_id, merchant_id),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_merchant_id (merchant_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='캠페인별 가맹점 할인 규칙';

-- 4. coupon_usage_logs (쿠폰 사용 로그) - user_coupons, campaigns 참조
CREATE TABLE IF NOT EXISTS coupon_usage_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_coupon_id BIGINT NOT NULL COMMENT '사용자 쿠폰 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID',
  campaign_id BIGINT NOT NULL COMMENT '캠페인 ID',
  merchant_id BIGINT NOT NULL COMMENT '가맹점 ID',
  approved_by_partner_id BIGINT NOT NULL COMMENT '승인한 파트너 ID',
  approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '승인 일시',
  order_amount DECIMAL(10,2) NOT NULL COMMENT '주문 금액',
  discount_amount DECIMAL(10,2) NOT NULL COMMENT '할인 금액',
  final_amount DECIMAL(10,2) NOT NULL COMMENT '최종 결제 금액',
  settlement_status ENUM('PENDING', 'COMPLETED', 'DISPUTED') DEFAULT 'PENDING' COMMENT '정산 상태',
  settlement_date DATE NULL COMMENT '정산 완료일',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_coupon (user_coupon_id),
  INDEX idx_campaign (campaign_id),
  INDEX idx_merchant (merchant_id),
  INDEX idx_approved_at (approved_at),
  INDEX idx_settlement_status (settlement_status),
  FOREIGN KEY (user_coupon_id) REFERENCES user_coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='쿠폰 사용 내역';

-- 5. kakao_users (카카오 연동) - 독립적 (users 테이블은 이미 존재한다고 가정)
CREATE TABLE IF NOT EXISTS kakao_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT 'Travleap users.id',
  kakao_user_id BIGINT UNIQUE NOT NULL COMMENT '카카오 고유 ID',
  kakao_email VARCHAR(255) COMMENT '카카오 이메일',
  kakao_nickname VARCHAR(100) COMMENT '카카오 닉네임',
  kakao_profile_image VARCHAR(500) COMMENT '카카오 프로필 이미지',
  kakao_access_token TEXT COMMENT '카카오 액세스 토큰',
  kakao_refresh_token TEXT COMMENT '카카오 리프레시 토큰',
  token_expires_at TIMESTAMP NULL COMMENT '토큰 만료 시간',
  message_agreed BOOLEAN DEFAULT FALSE COMMENT '카카오 메시지 수신 동의',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user (user_id),
  INDEX idx_kakao_user_id (kakao_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='카카오 로그인 연동';

-- 6. coupon_reviews (쿠폰 리뷰) - user_coupons 참조
CREATE TABLE IF NOT EXISTS coupon_reviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_coupon_id BIGINT NOT NULL COMMENT '사용자 쿠폰 ID',
  user_id BIGINT NOT NULL COMMENT '작성자 ID',
  merchant_id BIGINT NOT NULL COMMENT '가맹점 ID',
  campaign_id BIGINT NOT NULL COMMENT '캠페인 ID',
  rating INT NOT NULL COMMENT '평점 (1-5)',
  review_text TEXT COMMENT '리뷰 내용',
  points_awarded INT DEFAULT 0 COMMENT '지급된 포인트',
  points_awarded_at TIMESTAMP NULL COMMENT '포인트 지급 일시',
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED' COMMENT '리뷰 상태',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_coupon (user_coupon_id) COMMENT '쿠폰당 1개 리뷰',
  INDEX idx_user_id (user_id),
  INDEX idx_merchant_id (merchant_id),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_coupon_id) REFERENCES user_coupons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='쿠폰 사용 후 리뷰';

-- 7. kakao_message_logs (카카오 메시지 로그) - 독립적
CREATE TABLE IF NOT EXISTS kakao_message_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '수신자 ID',
  kakao_user_id BIGINT NOT NULL COMMENT '카카오 유저 ID',
  message_type ENUM('COUPON_ISSUED', 'COUPON_USED', 'REVIEW_REQUEST', 'POINTS_AWARDED') NOT NULL,
  template_id VARCHAR(50) COMMENT '템플릿 ID',
  status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'PENDING',
  error_message TEXT COMMENT '에러 메시지',
  related_coupon_id BIGINT COMMENT '관련 쿠폰 ID',
  related_campaign_id BIGINT COMMENT '관련 캠페인 ID',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_message_type (message_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='카카오 메시지 발송 로그';

-- ========================================
-- 마이그레이션 완료
-- ========================================
