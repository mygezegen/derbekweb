/*
  # Fix Events Insert Policy to Check Admin Status

  1. Changes
    - Drop the existing insert policy that only checks if member exists
    - Create new insert policy that checks if user is admin or root
  
  2. Security
    - Only authenticated users who are admin or root can create events
    - Matches the frontend validation logic
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "All authenticated users can create events" ON events;

-- Create new insert policy with admin check
CREATE POLICY "Authenticated admins can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  );
