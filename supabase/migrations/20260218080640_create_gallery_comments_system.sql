/*
  # Create Gallery Comments System

  1. New Tables
    - `gallery_comments`
      - `id` (uuid, primary key)
      - `gallery_image_id` (uuid, foreign key to gallery_images)
      - `member_id` (uuid, foreign key to members)
      - `comment` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on gallery_comments table
    - Public can read comments
    - Only authenticated members can create comments
    - Only comment author can update/delete their own comments
  
  3. Indexes
    - Add index on gallery_image_id for faster lookups
    - Add index on member_id for user's comment history
*/

-- Create gallery_comments table
CREATE TABLE IF NOT EXISTS gallery_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_image_id uuid NOT NULL REFERENCES gallery_images(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE gallery_comments ENABLE ROW LEVEL SECURITY;

-- Policies for gallery_comments
CREATE POLICY "Anyone can view comments"
  ON gallery_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated members can create comments"
  ON gallery_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.id = gallery_comments.member_id
    )
  );

CREATE POLICY "Members can update own comments"
  ON gallery_comments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.id = gallery_comments.member_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.id = gallery_comments.member_id
    )
  );

CREATE POLICY "Members can delete own comments"
  ON gallery_comments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.id = gallery_comments.member_id
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gallery_comments_image_id 
  ON gallery_comments(gallery_image_id);

CREATE INDEX IF NOT EXISTS idx_gallery_comments_member_id 
  ON gallery_comments(member_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_gallery_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_gallery_comments_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_gallery_comments_updated_at_trigger
      BEFORE UPDATE ON gallery_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_gallery_comments_updated_at();
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE gallery_comments IS 'Comments on gallery images from authenticated members';
COMMENT ON COLUMN gallery_comments.gallery_image_id IS 'Reference to the gallery image being commented on';
COMMENT ON COLUMN gallery_comments.member_id IS 'Reference to the member who made the comment';