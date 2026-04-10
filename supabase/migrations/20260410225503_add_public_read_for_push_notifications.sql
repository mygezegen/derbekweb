/*
  # Allow authenticated users to read sent push notifications

  ## Changes
  - Adds a SELECT policy on push_notifications for all authenticated users
  - Only sent notifications are relevant; filtering is done in the query

  ## Security
  - Existing admin-only policies remain untouched
  - Authenticated users can read notifications (not create/update/delete)
*/

CREATE POLICY "Authenticated users can view sent push notifications"
  ON push_notifications
  FOR SELECT
  TO authenticated
  USING (status = 'sent');
