/*
  # Add Parent Names and Required Registration Fields

  1. New Columns
    - `mother_name` (text, NOT NULL) - Mother's name
    - `father_name` (text, NOT NULL) - Father's name

  2. Changes
    - Make tc_identity_no, address, profession, and phone fields NOT NULL
    - Add constraints to ensure data quality

  3. Security
    - Maintain existing RLS policies
*/

-- Add mother_name and father_name columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'mother_name'
  ) THEN
    ALTER TABLE members ADD COLUMN mother_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'father_name'
  ) THEN
    ALTER TABLE members ADD COLUMN father_name text;
  END IF;
END $$;

-- Set default values for existing rows
UPDATE members 
SET mother_name = 'Belirtilmemiş' 
WHERE mother_name IS NULL;

UPDATE members 
SET father_name = 'Belirtilmemiş' 
WHERE father_name IS NULL;

UPDATE members 
SET tc_identity_no = '00000000000' 
WHERE tc_identity_no IS NULL;

UPDATE members 
SET address = 'Belirtilmemiş' 
WHERE address IS NULL;

UPDATE members 
SET profession = 'Belirtilmemiş' 
WHERE profession IS NULL;

UPDATE members 
SET phone = '00000000000' 
WHERE phone IS NULL;

-- Make fields NOT NULL
ALTER TABLE members ALTER COLUMN mother_name SET NOT NULL;
ALTER TABLE members ALTER COLUMN father_name SET NOT NULL;
ALTER TABLE members ALTER COLUMN tc_identity_no SET NOT NULL;
ALTER TABLE members ALTER COLUMN address SET NOT NULL;
ALTER TABLE members ALTER COLUMN profession SET NOT NULL;
ALTER TABLE members ALTER COLUMN phone SET NOT NULL;

-- Add constraint to ensure TC number is 11 digits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_tc_identity_no_length'
  ) THEN
    ALTER TABLE members ADD CONSTRAINT members_tc_identity_no_length 
    CHECK (length(tc_identity_no) = 11 AND tc_identity_no ~ '^[0-9]+$');
  END IF;
END $$;

-- Add constraint to ensure phone is valid format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_phone_valid'
  ) THEN
    ALTER TABLE members ADD CONSTRAINT members_phone_valid 
    CHECK (length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10);
  END IF;
END $$;

-- Create index on tc_identity_no for faster lookups
CREATE INDEX IF NOT EXISTS idx_members_tc_identity_no ON members(tc_identity_no);
