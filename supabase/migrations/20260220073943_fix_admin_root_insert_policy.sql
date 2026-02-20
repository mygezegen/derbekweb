/*
  # Fix INSERT policy to include root users

  ## Changes
  - Drop existing "Admins can create member profiles" INSERT policy
  - Recreate it to allow both admin (is_admin = true) AND root (is_root = true) users to insert new member records
*/

DROP POLICY IF EXISTS "Admins can create member profiles" ON members;

CREATE POLICY "Admins can create member profiles"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = (SELECT auth.uid())
      AND (m.is_admin = true OR m.is_root = true)
    )
  );
