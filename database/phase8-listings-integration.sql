-- ============================================
-- Phase 8: 렌트카-listings 연동
-- 목적: rentcar_vehicles와 listings 테이블 연결
-- ============================================

-- rentcar_vehicles에 listing_id 추가 (양방향 참조)
ALTER TABLE rentcar_vehicles
ADD COLUMN listing_id BIGINT NULL COMMENT 'listings 테이블 연결',
ADD INDEX idx_listing_id (listing_id);

-- listings에 rentcar_vehicle_id 추가 (역참조, 선택적)
ALTER TABLE listings
ADD COLUMN rentcar_vehicle_id BIGINT NULL COMMENT 'rentcar_vehicles 테이블 연결',
ADD INDEX idx_rentcar_vehicle (rentcar_vehicle_id);
