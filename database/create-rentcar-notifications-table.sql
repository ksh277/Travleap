-- ===============================================
-- rentcar_notifications 테이블 생성
-- 렌트카 알림 발송 기록 관리
-- ===============================================

CREATE TABLE IF NOT EXISTS rentcar_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- 예약 정보
  booking_id INT COMMENT '예약 ID (NULL 가능 - 벤더 알림의 경우)',

  -- 알림 타입
  notification_type VARCHAR(50) NOT NULL COMMENT '알림 타입 (check_in_reminder, block_expiry, late_checkout)',

  -- 수신자 정보
  recipient_email VARCHAR(255) COMMENT '수신자 이메일',
  recipient_phone VARCHAR(50) COMMENT '수신자 전화번호',

  -- 발송 내용
  message TEXT NOT NULL COMMENT '발송된 메시지 내용',

  -- 발송 채널
  channel VARCHAR(50) DEFAULT 'email' COMMENT '발송 채널 (email, sms, push)',

  -- 발송 상태
  status ENUM('pending', 'sent', 'failed') DEFAULT 'sent' COMMENT '발송 상태',
  error_message TEXT COMMENT '실패 시 에러 메시지',

  -- 발송 시각
  sent_at DATETIME NOT NULL COMMENT '발송 시각',

  -- 메타 정보
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- 인덱스
  INDEX idx_booking_id (booking_id),
  INDEX idx_notification_type (notification_type),
  INDEX idx_sent_at (sent_at),
  INDEX idx_status (status),

  -- 외래키
  FOREIGN KEY (booking_id) REFERENCES rentcar_bookings(id) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='렌트카 알림 발송 기록';

-- 통계 쿼리용 인덱스
CREATE INDEX idx_type_status_sent ON rentcar_notifications(notification_type, status, sent_at);
