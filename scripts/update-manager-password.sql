-- Update manager@shinan.com password to 'ha1045'
-- Generated on: 2025-10-15

UPDATE users
SET
  password_hash = '$2b$10$JUKoK.3Y69dE5rVOJpgCvuNnDO0Ce5SUb61m/ae0kdBfAVsrcPciC',
  updated_at = NOW()
WHERE email = 'manager@shinan.com';

-- Verify the update
SELECT id, user_id, email, name, role, updated_at
FROM users
WHERE email = 'manager@shinan.com';
