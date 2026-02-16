/*
  # Add Default Contact Info

  1. Changes
    - Insert default contact info record if none exists
    - Set default values for address, phone, email
    - Initialize empty social_media object
  
  2. Notes
    - Uses DO block to check if record exists before inserting
    - Safe to run multiple times
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM contact_info LIMIT 1) THEN
    INSERT INTO contact_info (address, phone, email, social_media)
    VALUES (
      'Çaybaşı Köyü, Çüngüş, Diyarbakır',
      '+90 XXX XXX XX XX',
      'info@caybasi.org',
      '{}'::jsonb
    );
  END IF;
END $$;
