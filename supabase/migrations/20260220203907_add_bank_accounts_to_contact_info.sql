/*
  # Add bank_accounts to contact_info table

  ## Changes
  - Adds a `bank_accounts` JSONB column to the `contact_info` table
  - This stores an array of bank account objects, each with:
    - bank_name: Bank name (e.g. "Ziraat Bankası")
    - iban: IBAN number
    - account_holder: Account holder name
    - account_no: Optional account number

  ## Purpose
  Allows the association to display bank payment details on the public landing page
  so members and donors can make transfers for dues and donations.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_info' AND column_name = 'bank_accounts'
  ) THEN
    ALTER TABLE public.contact_info ADD COLUMN bank_accounts jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
