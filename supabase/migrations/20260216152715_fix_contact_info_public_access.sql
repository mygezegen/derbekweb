/*
  # Fix Contact Info Public Access

  1. Changes
    - Drop existing SELECT policy that only allows authenticated users
    - Create new SELECT policy that allows both authenticated and anonymous users
  
  2. Security
    - Contact info is public information that should be visible on landing page
    - Only admins can still update/insert contact info
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can view contact info" ON contact_info;

-- Create new policy that allows both authenticated and anonymous users
CREATE POLICY "Public can view contact info"
  ON contact_info
  FOR SELECT
  TO authenticated, anon
  USING (true);
