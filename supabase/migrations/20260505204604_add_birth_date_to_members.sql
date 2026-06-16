/*
  # Add birth_date column to members table

  1. Changes
    - `members` tablosuna `birth_date` (date) kolonu eklendi
    - Opsiyonel alan (nullable), mevcut kayıtlar etkilenmez
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE members ADD COLUMN birth_date date;
  END IF;
END $$;
