/*
  # Set Initial Root User

  1. Changes
    - Temporarily disable the root check trigger
    - Set the first user (ahmettastelen@googlemail.com) as root
    - Re-enable the trigger
  
  2. Security
    - This is a one-time setup for the initial root user
    - After this, only root users can modify root/admin status
*/

-- Temporarily disable the trigger
ALTER TABLE members DISABLE TRIGGER enforce_root_only_fields;

-- Set the initial root user
UPDATE members 
SET is_root = true, is_admin = true 
WHERE email = 'ahmettastelen@googlemail.com';

-- Re-enable the trigger
ALTER TABLE members ENABLE TRIGGER enforce_root_only_fields;
