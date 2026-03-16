/*
  # Fix Surveys Admin SELECT Policy

  ## Problem
  The "Admins can manage surveys" policy was removed and not replaced with a SELECT policy for admins.
  This causes the .insert().select() chain to fail since admins cannot read back the inserted row.

  ## Fix
  Add a SELECT policy allowing admins to view all surveys (any status).
*/

DROP POLICY IF EXISTS "Admins can view all surveys" ON surveys;

CREATE POLICY "Admins can view all surveys"
  ON surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );
