/*
  # Add Root-Only Delete Policies for Financial Records

  1. Security Changes
    - Add DELETE policies for member_dues (root only)
    - Add DELETE policies for donations (root only)
    - Add DELETE policies for transactions (root only)
    - Add DELETE policies for dues (root only)

  2. Important Notes
    - Only root users can delete financial records
    - This prevents accidental deletion of important financial data
    - Admins can still insert and update, but cannot delete
*/

-- Delete policy for member_dues (root only)
DROP POLICY IF EXISTS "Root users can delete member dues" ON member_dues;
CREATE POLICY "Root users can delete member dues"
  ON member_dues
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- Delete policy for donations (root only)
DROP POLICY IF EXISTS "Root users can delete donations" ON donations;
CREATE POLICY "Root users can delete donations"
  ON donations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- Delete policy for transactions (root only)
DROP POLICY IF EXISTS "Root users can delete transactions" ON transactions;
CREATE POLICY "Root users can delete transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- Delete policy for dues (root only)
DROP POLICY IF EXISTS "Root users can delete dues" ON dues;
CREATE POLICY "Root users can delete dues"
  ON dues
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );