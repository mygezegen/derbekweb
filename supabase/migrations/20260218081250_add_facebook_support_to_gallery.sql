/*
  # Add Facebook Support to Gallery

  1. Changes
    - Add CHECK constraint to include 'facebook' as valid media_type
    - Update column comment to reflect new type
  
  2. Notes
    - Facebook posts can include images, videos, or other content
    - video_url will store the Facebook post/video link
    - media_type is stored as text with constraint
*/

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'gallery_images' AND constraint_name LIKE '%media_type%'
  ) THEN
    ALTER TABLE gallery_images DROP CONSTRAINT IF EXISTS gallery_images_media_type_check;
  END IF;
END $$;

-- Add new constraint that includes facebook
ALTER TABLE gallery_images 
  ADD CONSTRAINT gallery_images_media_type_check 
  CHECK (media_type IN ('image', 'youtube', 'instagram', 'facebook'));

-- Update comment
COMMENT ON COLUMN gallery_images.media_type IS 'Type of media: image (uploaded file), youtube (YouTube video URL), instagram (Instagram post URL), or facebook (Facebook post/video URL)';