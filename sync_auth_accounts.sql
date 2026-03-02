-- Script to create auth accounts for members without auth_id
-- This will be executed manually in batches

DO $$
DECLARE
  member_record RECORD;
  temp_password TEXT;
  new_auth_id UUID;
  processed_count INT := 0;
  failed_count INT := 0;
BEGIN
  -- Process members without auth_id in batches
  FOR member_record IN
    SELECT id, email, full_name
    FROM members
    WHERE auth_id IS NULL
    LIMIT 50  -- Process 50 at a time
  LOOP
    BEGIN
      -- Generate temporary password
      temp_password := 'Temp' || substr(md5(random()::text), 1, 15) || '!';

      -- Note: We cannot create auth.users directly from SQL in Supabase
      -- This will need to be done via the Edge Function or Admin API

      RAISE NOTICE 'Need to create auth for: % (%)', member_record.full_name, member_record.email;
      processed_count := processed_count + 1;

    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
      RAISE NOTICE 'Failed for: % - Error: %', member_record.email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Processed: %, Failed: %', processed_count, failed_count;
END $$;
