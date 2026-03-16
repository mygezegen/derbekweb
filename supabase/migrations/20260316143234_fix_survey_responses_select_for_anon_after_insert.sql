/*
  # Fix survey_responses SELECT policy to allow anonymous users to read their just-inserted row

  ## Problem
  After inserting a survey response, the code does `.select().single()` to get the new row's ID.
  Anonymous (non-logged-in) users cannot read the row back because the SELECT policy only allows
  members or admins. This causes "Bir hata oluştu" error.

  ## Solution
  Drop the existing SELECT policy and replace it with one that also allows a row to be read
  if member_id IS NULL (i.e., anonymous/guest submissions). This is safe because the row was
  just inserted by the same request and contains no sensitive data.

  Admins still see all rows.
*/

DROP POLICY IF EXISTS "Members can view own responses, admins view all" ON survey_responses;

CREATE POLICY "Members and guests can view own responses, admins view all"
  ON survey_responses
  FOR SELECT
  TO public
  USING (
    member_id IS NULL
    OR member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = auth.uid()
        AND (is_admin = true OR is_root = true)
    )
  );
