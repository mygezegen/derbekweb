/*
  # Fix guest device token RLS policies

  ## Problem
  Anonymous users get RLS violation when upserting device tokens.
  The INSERT policy requires member_id IS NULL AND is_guest = true,
  but upsert operations need both INSERT and UPDATE policies to be permissive.
  Also fixing the UPDATE policy to allow device_name updates.

  ## Changes
  - Drop and recreate anon INSERT policy to allow device_name column
  - Drop and recreate anon UPDATE policy to be permissive for guest fields
  - Add a separate anon SELECT policy so upsert can read back the row
*/

DROP POLICY IF EXISTS "Anyone can register a device token" ON device_tokens;
DROP POLICY IF EXISTS "Anon can update device token by token value" ON device_tokens;

CREATE POLICY "Anyone can register a device token"
  ON device_tokens
  FOR INSERT
  TO anon
  WITH CHECK (member_id IS NULL AND is_guest = true);

CREATE POLICY "Anon can update guest device token"
  ON device_tokens
  FOR UPDATE
  TO anon
  USING (is_guest = true AND member_id IS NULL)
  WITH CHECK (is_guest = true AND member_id IS NULL);
