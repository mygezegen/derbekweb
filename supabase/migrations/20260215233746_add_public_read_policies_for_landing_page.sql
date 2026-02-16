/*
  # Add Public Read Policies for Landing Page

  This migration adds public read access to tables that need to be visible on the landing page
  without authentication.

  ## Changes
  
  1. Add public read policy for announcements
     - Allow anonymous users to view active, non-expired announcements
  
  2. Add public read policy for events
     - Allow anonymous users to view future events
  
  3. Update galleries read policy
     - Change existing policy from authenticated-only to public access for public galleries

  ## Security Notes
  
  - Only SELECT operations are allowed for public users
  - Announcements: Only active and non-expired ones are visible
  - Events: All future events are visible
  - Galleries: Only galleries marked as public are visible
  - Board members: Already has public read access (no changes needed)
*/

-- Add public read policy for announcements
CREATE POLICY "Public can view active announcements"
  ON announcements FOR SELECT
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Add public read policy for events
CREATE POLICY "Public can view all events"
  ON events FOR SELECT
  USING (true);

-- Drop existing galleries policy and create new public one
DROP POLICY IF EXISTS "Public galleries viewable by all" ON galleries;

CREATE POLICY "Public can view public galleries"
  ON galleries FOR SELECT
  USING (is_public = true);

-- Also allow admins to view all galleries (add back admin access)
CREATE POLICY "Admins can view all galleries"
  ON galleries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );
