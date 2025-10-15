-- 배너 관리 테이블 생성
CREATE TABLE IF NOT EXISTS `home_banners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `image_url` VARCHAR(500) NOT NULL COMMENT '배너 이미지 URL',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '배너 제목',
  `link_url` VARCHAR(500) DEFAULT NULL COMMENT '클릭 시 이동할 URL',
  `display_order` INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '활성화 여부',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_display_order` (`display_order`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='홈페이지 배너 관리';
