-- ============================================
-- Fix missing columns in partners and rentcar_vendors tables
-- ============================================
-- Created: 2025-10-17
-- Priority: P2 (Causes runtime errors)
-- ============================================

-- 1. Add is_active column to partners table
-- Used in: Partner listing queries (WHERE is_active = 1)
ALTER TABLE partners
ADD COLUMN is_active TINYINT(1) DEFAULT 1
COMMENT '활성화 여부 (1=활성, 0=비활성)'
AFTER is_featured;

-- 2. Add rating column to rentcar_vendors table
-- Used in: Vendor display queries (SELECT vendor.rating)
ALTER TABLE rentcar_vendors
ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00
COMMENT '평균 평점 (0.00-5.00)'
AFTER business_name;

-- ============================================
-- Verification queries
-- ============================================

-- Check partners.is_active
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'partners' AND COLUMN_NAME = 'is_active';

-- Check rentcar_vendors.rating
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'rentcar_vendors' AND COLUMN_NAME = 'rating';

-- Test queries
SELECT id, business_name, is_active FROM partners LIMIT 1;
SELECT id, business_name, rating FROM rentcar_vendors LIMIT 1;
