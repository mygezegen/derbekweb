/*
  # Add device_name column to device_tokens

  ## Changes
  - Adds `device_name` text column to `device_tokens` table
    - Stores human-readable device identifier (e.g. "iPhone 14 Pro", "Samsung Galaxy S23")
    - Nullable, populated by mobile app on registration
  - Adds `app_version` text column for version tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_tokens' AND column_name = 'device_name'
  ) THEN
    ALTER TABLE device_tokens ADD COLUMN device_name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_tokens' AND column_name = 'app_version'
  ) THEN
    ALTER TABLE device_tokens ADD COLUMN app_version text;
  END IF;
END $$;
