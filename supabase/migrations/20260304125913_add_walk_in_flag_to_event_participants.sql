/*
  # Add walk_in flag to event_participants

  ## Summary
  Adds a `walk_in` boolean column to track participants who arrived at an event
  without being pre-registered by an admin. These participants are auto-created
  during QR check-in when their member_id is found in the members table but they
  were not previously added to the event participant list.

  ## Changes
  - `event_participants.walk_in` (boolean, default false): true when the participant
    record was created automatically at QR check-in time (not pre-registered by admin)

  ## Security
  - No RLS changes needed; existing admin update policy covers this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_participants' AND column_name = 'walk_in'
  ) THEN
    ALTER TABLE event_participants ADD COLUMN walk_in boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_participants_walk_in
  ON event_participants (event_id, walk_in);
