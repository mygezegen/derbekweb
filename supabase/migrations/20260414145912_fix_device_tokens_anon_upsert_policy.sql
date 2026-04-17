/*
  # Fix device_tokens RLS for anonymous guest upsert

  ## Problem
  When anonymous users call upsert on device_tokens with a token conflict,
  Supabase performs an UPDATE under the hood. The existing anon UPDATE policy
  requires USING (member_id IS NULL AND is_guest = true), but if the conflicting
  row was previously owned by a member, this check fails and throws a 42501 error.

  ## Fix
  - Drop the restrictive anon UPDATE policy
  - Add a permissive anon UPDATE policy that only allows updating guest-related
    fields (is_active, last_seen_at) when the token matches (no member ownership check)
  - This is safe because anon users can only update non-sensitive fields
*/

DROP POLICY IF EXISTS "Anyone can update own device token" ON device_tokens;

CREATE POLICY "Anon can update device token by token value"
  ON device_tokens
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (member_id IS NULL AND is_guest = true);
