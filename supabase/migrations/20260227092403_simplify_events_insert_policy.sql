/*
  # Simplify Events Insert Policy

  1. Changes
    - Drop existing restrictive INSERT policy
    - Create simplified policy that only checks admin status
    - Allow any created_by value for admins (validation happens in application layer)
    
  2. Security
    - Only admin/root users can create events
    - Application validates created_by before insert
    - Simpler policy reduces RLS complexity
  
  3. Notes
    - This approach trusts application-level validation
    - RLS still prevents non-admins from creating events
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can create events" ON events;

-- Create simplified insert policy
CREATE POLICY "Admins can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  );
