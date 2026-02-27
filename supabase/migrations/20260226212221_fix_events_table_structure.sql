/*
  # Fix Events Table Structure
  
  1. Changes
    - Add `date` and `time` columns to events table
    - Keep `event_date` for backward compatibility
    - Update RLS policies if needed
    
  2. Security
    - Maintains existing RLS policies
*/

-- Add date and time columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'date'
  ) THEN
    ALTER TABLE events ADD COLUMN date text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'time'
  ) THEN
    ALTER TABLE events ADD COLUMN time text;
  END IF;
END $$;

-- Make event_date nullable since we now have date and time columns
ALTER TABLE events ALTER COLUMN event_date DROP NOT NULL;
