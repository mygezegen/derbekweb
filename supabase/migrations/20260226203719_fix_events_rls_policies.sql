/*
  # Fix Events RLS Policies

  1. Changes
    - Drop existing restrictive policies on events table
    - Add simpler policies that check admin status correctly
    - Ensure authenticated users who are admins can create/update/delete events
    
  2. Security
    - Maintains RLS protection
    - Checks admin status from members table
    - All authenticated users can view events
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;
DROP POLICY IF EXISTS "Anyone authenticated can view events" ON events;

-- Create new simplified policies
CREATE POLICY "Authenticated admins can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Authenticated admins can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Authenticated admins can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Anyone can view events"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);
