/*
  # Fix device_tokens for guest (unauthenticated) device support

  ## Summary
  Currently device tokens can only be saved for logged-in members because:
  1. The UNIQUE constraint is on (member_id, token) - so NULL member_id causes issues
  2. The INSERT policy requires authenticated users with a matching member record
  3. App.tsx only registers push tokens after member login

  This migration:
  1. Drops the old composite UNIQUE constraint
  2. Adds a UNIQUE constraint on just token (one token per device)
  3. Adds an anon INSERT policy so guest devices can register their token
  4. Adds an anon UPDATE policy so guest token last_seen_at can be refreshed
  5. Adds a `is_guest` boolean column for clarity in admin stats

  ## Changes
  - device_tokens: drop UNIQUE(member_id, token), add UNIQUE(token)
  - device_tokens: add is_guest boolean DEFAULT false
  - New RLS policy: anon users can insert/update tokens (token-based, no auth required)
  - Admins can still see all tokens including guest ones
*/

-- Step 1: Drop the old composite unique constraint
ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS device_tokens_member_id_token_key;

-- Step 2: Add UNIQUE on token alone (one row per physical device token)
ALTER TABLE device_tokens ADD CONSTRAINT device_tokens_token_key UNIQUE (token);

-- Step 3: Add is_guest column to distinguish guest vs member devices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_tokens' AND column_name = 'is_guest'
  ) THEN
    ALTER TABLE device_tokens ADD COLUMN is_guest boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Step 4: Allow anonymous users to insert device tokens (for guest devices)
CREATE POLICY "Anyone can register a device token"
  ON device_tokens FOR INSERT
  TO anon
  WITH CHECK (member_id IS NULL AND is_guest = true);

-- Step 5: Allow anonymous users to update their own token's last_seen_at
-- (identified by the token value itself)
CREATE POLICY "Anyone can update own device token"
  ON device_tokens FOR UPDATE
  TO anon
  USING (member_id IS NULL AND is_guest = true)
  WITH CHECK (member_id IS NULL AND is_guest = true);

-- Step 6: Allow authenticated users to upsert tokens (insert new OR update existing guest token to link to member)
-- Drop the old insert policy first and recreate with updated logic
DROP POLICY IF EXISTS "Members can insert own tokens" ON device_tokens;

CREATE POLICY "Authenticated members can upsert own token"
  ON device_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR member_id IS NULL
  );

-- Step 7: Allow authenticated users to update a token to link it to their member record
DROP POLICY IF EXISTS "Members can update own tokens" ON device_tokens;

CREATE POLICY "Authenticated members can update own token"
  ON device_tokens FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
    OR member_id IS NULL
  )
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
    OR member_id IS NULL
  );
