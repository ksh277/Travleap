-- 모든 listings의 rating_count와 rating_avg를 실제 리뷰 데이터 기반으로 업데이트

-- 1. 모든 listings의 rating_count와 rating_avg를 0으로 초기화
UPDATE listings
SET
  rating_count = 0,
  rating_avg = 0
WHERE 1=1;

-- 2. 실제 리뷰가 있는 listings만 업데이트
UPDATE listings l
LEFT JOIN (
  SELECT
    listing_id,
    COUNT(*) as review_count,
    AVG(rating) as avg_rating
  FROM reviews
  WHERE status = 'approved'
  GROUP BY listing_id
) r ON l.id = r.listing_id
SET
  l.rating_count = COALESCE(r.review_count, 0),
  l.rating_avg = COALESCE(r.avg_rating, 0);

-- 3. 결과 확인
SELECT
  id,
  title,
  rating_count,
  rating_avg,
  category_id
FROM listings
WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('stay', 'activity', 'rentcar'))
ORDER BY rating_count DESC, rating_avg DESC
LIMIT 20;
