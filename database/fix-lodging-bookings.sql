-- Fix lodging_bookings table: Add missing columns
-- Critical fix for lodgingExpiry.worker.ts compatibility

-- Add hold_expires_at column (HOLD expiration time - MOST CRITICAL)
ALTER TABLE lodging_bookings
ADD COLUMN hold_expires_at DATETIME DEFAULT NULL COMMENT 'HOLD 만료 시각 (10분)' AFTER payment_status;

-- Add rooms_booked column (number of rooms reserved)
ALTER TABLE lodging_bookings
ADD COLUMN rooms_booked INT DEFAULT 1 AFTER num_guests;

-- Create composite index for hold expiration queries (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_hold_status ON lodging_bookings(booking_status, payment_status, hold_expires_at);

-- Update rooms_booked to 1 for existing rows (if any)
UPDATE lodging_bookings
SET rooms_booked = 1
WHERE rooms_booked IS NULL OR rooms_booked = 0;

SELECT 'lodging_bookings table fixed: hold_expires_at and rooms_booked columns added' AS status;
