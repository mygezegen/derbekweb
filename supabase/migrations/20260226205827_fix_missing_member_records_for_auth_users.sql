/*
  # Fix Missing Member Records for Auth Users

  1. Changes
    - Creates member records for all auth.users who don't have a member record
    - Sets the first user as root and admin
    - Ensures future auth users automatically get member records via trigger

  2. Security
    - No RLS changes needed, existing policies remain
*/

-- Create member records for all existing auth users who don't have a member record
INSERT INTO members (auth_id, full_name, email, is_admin, is_root, is_active)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  au.email,
  false as is_admin,
  false as is_root,
  true as is_active
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM members m WHERE m.auth_id = au.id
);

-- Set the first user (oldest) as root and admin
UPDATE members
SET is_admin = true, is_root = true
WHERE auth_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
);

-- Ensure the trigger exists for automatic member creation
CREATE OR REPLACE FUNCTION create_member_from_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO members (auth_id, full_name, email, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_member_from_auth_user();
