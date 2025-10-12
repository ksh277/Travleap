-- ============================================
-- Phase 7: Notification System
-- 알림 이력 테이블
-- ============================================

CREATE TABLE notification_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  channel ENUM('email', 'sms', 'push') NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  recipient_user_id BIGINT,
  data JSON,
  success TINYINT(1) DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_notification_type (type),
  INDEX idx_notification_channel (channel),
  INDEX idx_notification_user (recipient_user_id),
  INDEX idx_notification_created (created_at),
  INDEX idx_notification_success (success, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
