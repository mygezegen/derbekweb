/*
  # Create Function to Cleanup Duplicate Members

  1. Purpose
    - Automatically find and remove duplicate member records
    - Transfer all related data from duplicate to primary member
    - Primary member = the one with auth_id
    - Duplicate member = the one without auth_id but same email
  
  2. Function
    - Can be called repeatedly to clean up duplicates
    - Returns count of cleaned up records
*/

CREATE OR REPLACE FUNCTION cleanup_duplicate_members()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Create temporary mapping table
  CREATE TEMP TABLE IF NOT EXISTS temp_duplicate_mapping AS
  SELECT 
    m_null.id as duplicate_id,
    m_with.id as primary_id,
    m_null.email
  FROM members m_null
  JOIN members m_with ON m_null.email = m_with.email
  WHERE m_null.auth_id IS NULL
    AND m_with.auth_id IS NOT NULL;

  -- Update member_dues
  UPDATE member_dues md
  SET member_id = tdm.primary_id
  FROM temp_duplicate_mapping tdm
  WHERE md.member_id = tdm.duplicate_id;

  -- Update donations
  UPDATE donations d
  SET member_id = tdm.primary_id
  FROM temp_duplicate_mapping tdm
  WHERE d.member_id = tdm.duplicate_id;

  -- Delete duplicate members
  WITH deleted AS (
    DELETE FROM members
    WHERE id IN (SELECT duplicate_id FROM temp_duplicate_mapping)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Cleanup temp table
  DROP TABLE IF EXISTS temp_duplicate_mapping;

  RETURN deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_duplicate_members() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_members() TO anon;
