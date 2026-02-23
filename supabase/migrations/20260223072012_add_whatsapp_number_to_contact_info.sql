/*
  # Add WhatsApp Number to Contact Info

  1. Changes
    - Adds `whatsapp_number` column to `contact_info` table
    - Stores the WhatsApp phone number (digits only, e.g. 905322834038)
    - Default value set to existing hardcoded number for backwards compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_info' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE contact_info ADD COLUMN whatsapp_number text DEFAULT '905322834038';
  END IF;
END $$;
