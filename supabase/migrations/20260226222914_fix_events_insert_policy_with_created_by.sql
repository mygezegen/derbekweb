/*
  # Fix Events Insert Policy to Allow Created By Field

  1. Changes
    - Drop existing insert policy for events
    - Create new insert policy that properly validates created_by field
    - Ensure admin/root users can create events with valid created_by reference

  2. Security
    - Maintains admin/root only access for event creation
    - Validates that created_by references a valid member
    - Ensures created_by matches the authenticated user's member record
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated admins can create events" ON events;

-- Create new insert policy with proper created_by validation
CREATE POLICY "Authenticated admins can create events"
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
