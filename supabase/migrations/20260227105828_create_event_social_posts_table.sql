/*
  # Create Event Social Media Posts Tracking Table

  1. New Tables
    - `event_social_posts`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to events)
      - `platform` (text) - facebook, instagram
      - `post_id` (text) - Platform's post ID
      - `post_url` (text) - URL to the post
      - `status` (text) - pending, published, failed
      - `error_message` (text) - Error details if failed
      - `posted_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Admins can view post history
    - System can insert/update posts
*/

-- Create event_social_posts table
CREATE TABLE IF NOT EXISTS event_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  post_id text,
  post_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  error_message text,
  posted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_social_posts_event_id ON event_social_posts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_social_posts_platform ON event_social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_event_social_posts_status ON event_social_posts(status);

-- Enable RLS
ALTER TABLE event_social_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view event social posts"
  ON event_social_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "System can insert event social posts"
  ON event_social_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update event social posts"
  ON event_social_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
