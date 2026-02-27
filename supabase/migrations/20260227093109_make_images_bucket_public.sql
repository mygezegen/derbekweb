/*
  # Make Images Bucket Public

  1. Changes
    - Update images bucket to be public
    - This allows getPublicUrl() to work correctly
    
  2. Security
    - RLS policies still control who can upload/delete
    - Anyone can view images (appropriate for public calendar and gallery)
    
  3. Notes
    - Fixes issue where event images were not displaying
    - Public read access is intentional for the use case
*/

-- Make the images bucket public
UPDATE storage.buckets
SET public = true
WHERE name = 'images';
