-- 포인트 시스템 추가 마이그레이션
-- PlanetScale 콘솔에서 실행하세요
-- ⚠️ 주의: 한 줄씩 실행하고 에러 확인하세요!

-- 1. user_points 테이블 생성 (포인트 내역)
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

-- 2. bookings 테이블에 points_earned 컬럼 추가
-- ⚠️ 이미 존재하면 에러 발생 (무시하고 계속 진행)
ALTER TABLE bookings ADD COLUMN points_earned INT DEFAULT 0 COMMENT '적립된 포인트';

-- 3. 완료 확인
SELECT '✅ 포인트 시스템 마이그레이션 완료!' as status;
