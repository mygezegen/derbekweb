/*
  # Create Social Media Configuration Table

  1. New Tables
    - `social_media_config`
      - `id` (uuid, primary key)
      - `platform` (text) - facebook, instagram
      - `access_token` (text, encrypted)
      - `page_id` (text) - Facebook page ID or Instagram business account ID
      - `is_active` (boolean) - Whether auto-posting is enabled
      - `auto_post_events` (boolean) - Auto-post new events
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Only admins can manage configurations
*/

-- Create social_media_config table
CREATE TABLE IF NOT EXISTS social_media_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  access_token text NOT NULL,
  page_id text NOT NULL,
  is_active boolean DEFAULT true,
  auto_post_events boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(platform)
);

-- Enable RLS
ALTER TABLE social_media_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view social media config"
  ON social_media_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can insert social media config"
  ON social_media_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update social media config"
  ON social_media_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete social media config"
  ON social_media_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Add trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_social_media_config_updated_at'
  ) THEN
    CREATE FUNCTION update_social_media_config_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_social_media_config_updated_at ON social_media_config;
CREATE TRIGGER update_social_media_config_updated_at
  BEFORE UPDATE ON social_media_config
  FOR EACH ROW
  EXECUTE FUNCTION update_social_media_config_updated_at();
