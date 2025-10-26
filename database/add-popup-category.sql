-- ===============================================
-- 팝업 카테고리 추가
-- ===============================================

-- 1. 팝업 카테고리가 없으면 추가
INSERT IGNORE INTO categories
(slug, name_ko, name_en, name_jp, name_cn, icon, sort_order, is_active)
VALUES
('popup', '팝업', 'Popup', 'ポップアップ', '弹出', '🎪', 7, 1);

-- 2. 확인 쿼리
SELECT * FROM categories WHERE slug = 'popup';

-- 3. 전체 카테고리 목록 확인
SELECT id, slug, name_ko, name_en, icon, sort_order, is_active
FROM categories
ORDER BY sort_order ASC;
