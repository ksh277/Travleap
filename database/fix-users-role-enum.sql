-- Add 'vendor' role to users table
-- CRITICAL: Required for vendor account creation API

ALTER TABLE users
MODIFY COLUMN role ENUM('user','partner','vendor','admin') DEFAULT 'user';

SELECT 'users.role ENUM updated: added vendor role' AS status;
