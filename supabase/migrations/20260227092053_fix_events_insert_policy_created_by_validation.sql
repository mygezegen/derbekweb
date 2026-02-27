/*
  # Fix Events Insert Policy - Created By Validation

  1. Changes
    - Drop existing "Admins can create events" INSERT policy
    - Create new INSERT policy that validates created_by field
    - Ensure created_by matches the authenticated user's member record
    
  2. Security
    - Only admin/root users can create events
    - created_by must reference the authenticated user's member record
    - Prevents users from creating events on behalf of other members
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can create events" ON events;

-- Create new insert policy with created_by validation
CREATE POLICY "Admins can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
        AND members.id = events.created_by
    )
  );
