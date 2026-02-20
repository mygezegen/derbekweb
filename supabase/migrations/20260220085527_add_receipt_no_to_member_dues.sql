/*
  # Add receipt_no to member_dues

  Adds an optional receipt number field to member_dues table for tracking payment receipts.

  1. Changes
    - `member_dues`: new `receipt_no` (text, nullable) column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_dues' AND column_name = 'receipt_no'
  ) THEN
    ALTER TABLE member_dues ADD COLUMN receipt_no text;
  END IF;
END $$;
