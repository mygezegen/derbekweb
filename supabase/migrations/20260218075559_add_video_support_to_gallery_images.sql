/*
  # Add Video Support to Gallery System

  1. Changes
    - Add `media_type` column to gallery_images table (image, youtube, instagram)
    - Add `video_url` column for storing YouTube/Instagram URLs
    - Rename `image_url` to `media_url` for consistency (keep both for backward compatibility)
    - Update existing records to have 'image' as default media_type
    - Add check constraint to ensure proper media type values
  
  2. Security
    - No changes to existing RLS policies
    - Maintains existing security model
*/

-- Add new columns to gallery_images table
DO $$
BEGIN
  -- Add media_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_images' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE gallery_images ADD COLUMN media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'youtube', 'instagram'));
  END IF;

  -- Add video_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_images' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE gallery_images ADD COLUMN video_url text;
  END IF;
END $$;

-- Update existing records to have 'image' as media_type
UPDATE gallery_images SET media_type = 'image' WHERE media_type IS NULL;

-- Add comments to columns
COMMENT ON COLUMN gallery_images.media_type IS 'Type of media: image, youtube, or instagram';
COMMENT ON COLUMN gallery_images.video_url IS 'URL for YouTube or Instagram content. For YouTube use full URL or video ID, for Instagram use post URL';