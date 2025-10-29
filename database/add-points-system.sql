-- 포인트 시스템 추가 마이그레이션
-- PlanetScale 콘솔에서 실행하세요

-- 1. users 테이블에 total_points 컬럼 추가
ALTER TABLE users ADD COLUMN total_points INT DEFAULT 0 COMMENT '사용자 보유 포인트';

-- 2. user_points 테이블 생성 (포인트 내역)
CREATE TABLE IF NOT EXISTS user_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '사용자 ID',
  points INT NOT NULL COMMENT '포인트 (적립 시 양수, 사용 시 음수)',
  point_type ENUM('earn', 'use', 'refund', 'expire', 'admin') NOT NULL COMMENT '포인트 유형',
  reason VARCHAR(500) NOT NULL COMMENT '적립/사용 사유',
  related_order_id VARCHAR(100) COMMENT '관련 주문 번호',
  related_payment_id INT COMMENT '관련 결제 ID',
  balance_after INT NOT NULL COMMENT '처리 후 잔액',
  expires_at DATETIME COMMENT '만료 일시 (적립 시만)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_point_type (point_type),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 포인트 내역';

-- 3. bookings 테이블에 points_earned 컬럼 추가 (없으면)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS points_earned INT DEFAULT 0 COMMENT '적립된 포인트';

-- 4. 기존 사용자들의 total_points를 0으로 초기화 (이미 DEFAULT 0이지만 명시적으로)
UPDATE users SET total_points = 0 WHERE total_points IS NULL;

-- 5. 인덱스 확인
SHOW INDEX FROM user_points;
SHOW INDEX FROM users;

SELECT '✅ 포인트 시스템 마이그레이션 완료!' as status;
