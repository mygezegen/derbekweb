/*
  # Add anon SELECT policy for device tokens

  ## Problem
  Anonymous (guest) users cannot read device_tokens to check if their token
  already exists before attempting an insert. This causes duplicate key errors.

  ## Changes
  - Add SELECT policy for anon role so they can look up their own token by value
*/

CREATE POLICY "Anon can read own guest device token"
  ON device_tokens
  FOR SELECT
  TO anon
  USING (is_guest = true AND member_id IS NULL);
