-- ===================================================
-- Add API columns to rentcar_vendors table
-- Run this in PlanetScale console manually
-- ===================================================

-- 1. Add api_url column
ALTER TABLE rentcar_vendors
ADD COLUMN api_url VARCHAR(500) NULL COMMENT '업체 API URL';

-- 2. Add api_key column
ALTER TABLE rentcar_vendors
ADD COLUMN api_key VARCHAR(500) NULL COMMENT 'API 인증 키';

-- 3. Add api_auth_type column
ALTER TABLE rentcar_vendors
ADD COLUMN api_auth_type VARCHAR(50) DEFAULT 'bearer' COMMENT 'API 인증 방식';

-- 4. Add api_enabled column
ALTER TABLE rentcar_vendors
ADD COLUMN api_enabled BOOLEAN DEFAULT FALSE COMMENT 'API 연동 활성화';

-- ===================================================
-- Verification Query
-- ===================================================
-- Run this to verify all columns were added:
-- DESCRIBE rentcar_vendors;
