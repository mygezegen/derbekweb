/*
  # Make tc_identity_no nullable for CSV imports
  
  1. Changes
    - Remove NOT NULL constraint from tc_identity_no column in members table
    - This allows importing members without TC identity numbers
  
  2. Security
    - No changes to RLS policies
    - Existing policies remain unchanged
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' 
    AND column_name = 'tc_identity_no'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE members ALTER COLUMN tc_identity_no DROP NOT NULL;
  END IF;
END $$;
