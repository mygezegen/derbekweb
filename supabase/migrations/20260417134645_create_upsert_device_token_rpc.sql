/*
  # Create atomic upsert_device_token RPC function

  ## Problem
  Client-side SELECT + INSERT pattern causes race conditions and duplicate key errors
  when the same token is registered multiple times concurrently.

  ## Solution
  A SECURITY DEFINER RPC function that performs a single atomic
  INSERT ... ON CONFLICT DO UPDATE, bypassing the race condition entirely.

  ## New Functions
  - `upsert_device_token(p_token, p_platform, p_member_id, p_is_guest, p_device_name)`
    Inserts or updates a device token atomically.
*/

CREATE OR REPLACE FUNCTION upsert_device_token(
  p_token text,
  p_platform text,
  p_member_id uuid DEFAULT NULL,
  p_is_guest boolean DEFAULT false,
  p_device_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO device_tokens (token, platform, member_id, is_guest, is_active, device_name, last_seen_at)
  VALUES (p_token, p_platform, p_member_id, p_is_guest, true, p_device_name, now())
  ON CONFLICT (token) DO UPDATE SET
    member_id    = EXCLUDED.member_id,
    is_guest     = EXCLUDED.is_guest,
    is_active    = true,
    device_name  = EXCLUDED.device_name,
    last_seen_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_device_token(text, text, uuid, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION upsert_device_token(text, text, uuid, boolean, text) TO authenticated;
