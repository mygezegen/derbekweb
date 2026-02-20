/*
  # Add DELETE policy for members table

  ## Changes
  - Add DELETE policy allowing admin and root users to delete member records
  - Users cannot delete their own record
*/

CREATE POLICY "Admins and root can delete members"
  ON members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = (SELECT auth.uid())
      AND (m.is_admin = true OR m.is_root = true)
    )
    AND auth_id != (SELECT auth.uid())
  );
