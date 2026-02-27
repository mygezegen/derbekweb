/*
  # Add Storage Policies for Images Bucket

  1. Changes
    - Add INSERT policy for authenticated users to upload images
    - Add SELECT policy for public read access to images
    - Add UPDATE policy for admins to update images
    - Add DELETE policy for admins to delete images
    
  2. Security
    - Authenticated users can upload images to events/ folder
    - Anyone can view images (public read)
    - Only admins can update or delete images
    
  3. Notes
    - Images bucket already exists
    - Policies allow event image uploads
    - Public can view images for public calendar
*/

-- Allow authenticated users to upload images to events folder
CREATE POLICY "Authenticated users can upload event images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images' 
    AND (storage.foldername(name))[1] = 'events'
  );

-- Allow public read access to all images
CREATE POLICY "Public can view images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'images');

-- Allow admins to update images
CREATE POLICY "Admins can update images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- Allow admins to delete images
CREATE POLICY "Admins can delete images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  );
