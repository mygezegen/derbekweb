/*
  # Add Social Media URLs to Configuration

  1. Changes
    - Add social media profile URLs to `social_media_config` table
    - Add columns for Instagram, Facebook, and YouTube URLs
    
  2. Purpose
    - Store social media profile URLs for easy access
    - Allow users to add posts from their social media accounts to gallery
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_config' AND column_name = 'instagram_url'
  ) THEN
    ALTER TABLE social_media_config 
    ADD COLUMN instagram_url text,
    ADD COLUMN facebook_url text,
    ADD COLUMN youtube_url text;
  END IF;
END $$;
