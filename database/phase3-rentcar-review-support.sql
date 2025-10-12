-- Phase 3: 렌트카 리뷰 지원 확장
-- 기존 reviews 테이블에 렌트카 관련 컬럼 추가

-- Step 1: 컬럼 추가
ALTER TABLE reviews
  ADD COLUMN review_type ENUM('listing', 'rentcar') DEFAULT 'listing' AFTER listing_id;

-- Step 2: 렌트카 관련 컬럼 추가
ALTER TABLE reviews
  ADD COLUMN rentcar_booking_id BIGINT NULL AFTER review_type;

-- Step 3
ALTER TABLE reviews
  ADD COLUMN rentcar_vendor_id BIGINT NULL AFTER rentcar_booking_id;

-- Step 4
ALTER TABLE reviews
  ADD COLUMN rentcar_vehicle_id BIGINT NULL AFTER rentcar_vendor_id;

-- Step 5: listing_id를 nullable로 변경
ALTER TABLE reviews
  MODIFY COLUMN listing_id BIGINT NULL;

-- 완료!
-- 이제 reviews 테이블은 일반 상품(listing) 리뷰와 렌트카 리뷰를 모두 지원합니다.
--
-- 사용 예시:
-- 일반 상품 리뷰: listing_id가 있고, review_type='listing'
-- 렌트카 리뷰: rentcar_booking_id, rentcar_vendor_id, rentcar_vehicle_id가 있고, review_type='rentcar'
