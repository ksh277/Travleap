-- Add insurance and options support to cart_items table
-- Date: 2025-11-17
-- Purpose: Enable cart to store selected insurance and product options

-- Add insurance and options columns to cart_items
ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS selected_insurance JSON NULL COMMENT 'Selected insurance product details (id, name, price, coverage_amount)',
ADD COLUMN IF NOT EXISTS insurance_fee DECIMAL(10,2) DEFAULT 0 COMMENT 'Insurance fee amount',
ADD COLUMN IF NOT EXISTS selected_options JSON NULL COMMENT 'Selected product options',
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1 COMMENT 'Item quantity',
ADD COLUMN IF NOT EXISTS num_infants INT DEFAULT 0 COMMENT 'Number of infants' AFTER num_children;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cart_user_listing ON cart_items(user_id, listing_id);

-- Update existing records to have default values
UPDATE cart_items
SET
  quantity = COALESCE(quantity, 1),
  insurance_fee = COALESCE(insurance_fee, 0),
  num_infants = COALESCE(num_infants, 0)
WHERE quantity IS NULL OR insurance_fee IS NULL OR num_infants IS NULL;

-- Verification query
SELECT
  COUNT(*) as total_cart_items,
  COUNT(selected_insurance) as items_with_insurance,
  COUNT(selected_options) as items_with_options,
  SUM(insurance_fee) as total_insurance_fees
FROM cart_items;
