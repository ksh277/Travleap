-- ============================================
-- Partners Table Enhancement for Partner Application System
-- ============================================
-- Created: 2025-11-03
-- Purpose: Add missing columns for partner application workflow
-- ============================================

-- Add missing columns to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS business_name VARCHAR(200) COMMENT '업체명 (신청서에서 사용)',
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100) COMMENT '담당자 이름',
ADD COLUMN IF NOT EXISTS business_address TEXT COMMENT '사업장 주소',
ADD COLUMN IF NOT EXISTS location VARCHAR(100) COMMENT '지역 (예: 전남 신안)',
ADD COLUMN IF NOT EXISTS services VARCHAR(100) COMMENT '카테고리 (accommodation, tour, rentcar 등)',
ADD COLUMN IF NOT EXISTS base_price VARCHAR(50) COMMENT '기본 가격',
ADD COLUMN IF NOT EXISTS base_price_text TEXT COMMENT '가격 설명',
ADD COLUMN IF NOT EXISTS detailed_address TEXT COMMENT '상세 주소',
ADD COLUMN IF NOT EXISTS images JSON COMMENT '이미지 URL 배열',
ADD COLUMN IF NOT EXISTS business_hours VARCHAR(200) COMMENT '영업시간',
ADD COLUMN IF NOT EXISTS duration VARCHAR(50) COMMENT '투어/체험 기간 (일)',
ADD COLUMN IF NOT EXISTS min_age VARCHAR(10) COMMENT '최소 연령',
ADD COLUMN IF NOT EXISTS max_capacity VARCHAR(10) COMMENT '최대 수용 인원',
ADD COLUMN IF NOT EXISTS language VARCHAR(100) COMMENT '제공 언어',
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8) COMMENT '위도',
ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8) COMMENT '경도',
ADD COLUMN IF NOT EXISTS is_verified TINYINT(1) DEFAULT 0 COMMENT '승인 여부',
ADD COLUMN IF NOT EXISTS approved_at DATETIME COMMENT '승인 일시',
ADD COLUMN IF NOT EXISTS rejected_at DATETIME COMMENT '거절 일시',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT COMMENT '거절 사유';

-- Update existing data: sync company_name to business_name if empty
UPDATE partners
SET business_name = company_name
WHERE business_name IS NULL OR business_name = '';

-- Update existing data: sync representative_name to contact_name if empty
UPDATE partners
SET contact_name = representative_name
WHERE contact_name IS NULL OR contact_name = '';

-- Update existing data: sync address to business_address if empty
UPDATE partners
SET business_address = address
WHERE business_address IS NULL OR business_address = '';

-- Update existing data: sync category to services if empty
UPDATE partners
SET services = category
WHERE services IS NULL OR services = '';

-- Add index for better query performance
ALTER TABLE partners
ADD INDEX IF NOT EXISTS idx_business_name (business_name),
ADD INDEX IF NOT EXISTS idx_location (location),
ADD INDEX IF NOT EXISTS idx_services (services),
ADD INDEX IF NOT EXISTS idx_is_verified (is_verified);

-- ============================================
-- Verification queries
-- ============================================

-- Check all new columns
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'partners'
  AND COLUMN_NAME IN (
    'business_name', 'contact_name', 'business_address', 'location', 'services',
    'base_price', 'base_price_text', 'detailed_address', 'images', 'business_hours',
    'duration', 'min_age', 'max_capacity', 'language', 'lat', 'lng',
    'is_verified', 'approved_at', 'rejected_at', 'rejection_reason'
  )
ORDER BY ORDINAL_POSITION;

-- Test query: Show pending partner applications
SELECT
  id,
  business_name,
  contact_name,
  email,
  phone,
  location,
  services,
  status,
  created_at
FROM partners
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;
