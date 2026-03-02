/*
  # Fix Duplicate Members and Merge Data

  1. Problem
    - Some members have duplicate records with the same email
    - One record has auth_id (primary record), the other doesn't (duplicate)
    - Duplicate records may have associated dues, donations, and other data
  
  2. Solution
    - Identify duplicate members (same email, one with auth_id, one without)
    - Transfer all related data (dues, donations, etc.) from duplicate to primary
    - Delete duplicate member records
    - This fixes the password reset issue for users with duplicate records
  
  3. Data Migration
    - Move member_dues from duplicate to primary member
    - Move donations from duplicate to primary member
    - Move event_participants from duplicate to primary member
    - Delete duplicate member records
*/

-- Step 1: Create a temporary table to store duplicate mappings
CREATE TEMP TABLE duplicate_member_mapping AS
SELECT 
  m_null.id as duplicate_id,
  m_with.id as primary_id,
  m_null.email
FROM members m_null
JOIN members m_with ON m_null.email = m_with.email
WHERE m_null.auth_id IS NULL
  AND m_with.auth_id IS NOT NULL;

-- Step 2: Update member_dues to point to primary member
UPDATE member_dues md
SET member_id = dmm.primary_id
FROM duplicate_member_mapping dmm
WHERE md.member_id = dmm.duplicate_id;

-- Step 3: Update donations to point to primary member
UPDATE donations d
SET member_id = dmm.primary_id
FROM duplicate_member_mapping dmm
WHERE d.member_id = dmm.duplicate_id;

-- Step 4: Update event_participants to point to primary member (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participants') THEN
    UPDATE event_participants ep
    SET member_id = dmm.primary_id
    FROM duplicate_member_mapping dmm
    WHERE ep.member_id = dmm.duplicate_id;
  END IF;
END $$;

-- Step 5: Delete duplicate member records
DELETE FROM members
WHERE id IN (SELECT duplicate_id FROM duplicate_member_mapping);

-- Step 6: Log the cleanup
DO $$
DECLARE
  deleted_count INT;
BEGIN
  SELECT COUNT(*) INTO deleted_count FROM duplicate_member_mapping;
  RAISE NOTICE 'Cleaned up % duplicate member records', deleted_count;
END $$;
