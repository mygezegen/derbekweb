/*
  # Add queried_name column to query_logs

  ## Summary
  Adds a `queried_name` text column to the `query_logs` table to store the
  full name of the member found during a TC-based query.

  ## Changes
  - `query_logs`: new nullable column `queried_name` (text)
    Populated by the member-query edge function when a member is found.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_logs' AND column_name = 'queried_name'
  ) THEN
    ALTER TABLE query_logs ADD COLUMN queried_name text;
  END IF;
END $$;
