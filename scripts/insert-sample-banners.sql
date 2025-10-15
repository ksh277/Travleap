-- 샘플 배너 데이터 추가
-- 먼저 테이블 생성 (없는 경우)
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

-- 샘플 배너 3개 추가
INSERT INTO `home_banners` (image_url, title, link_url, display_order, is_active) VALUES
('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop', '신안 여름 특별 할인', '/search?category=stay', 0, TRUE),
('https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=400&fit=crop', '갯벌 체험 프로그램', '/category/experience', 1, TRUE),
('https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=400&fit=crop', '홍도 투어 예약 오픈', '/category/tour', 2, TRUE);
