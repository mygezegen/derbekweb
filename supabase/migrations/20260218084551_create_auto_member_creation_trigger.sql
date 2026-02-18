/*
  # Auto Member Creation Trigger

  1. Changes
    - Create trigger to automatically create member record when new user signs up
    - Trigger runs after auth.users insert
    - Creates member with default values that can be updated later

  2. Security
    - Uses SECURITY DEFINER to bypass RLS
    - Only creates member if one doesn't exist
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new member record with default values
  INSERT INTO public.members (
    id,
    auth_id,
    full_name,
    email,
    tc_identity_no,
    mother_name,
    father_name,
    address,
    profession,
    phone,
    is_admin
  ) VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    '00000000000',
    'Belirtilmemiş',
    'Belirtilmemiş',
    'Belirtilmemiş',
    'Belirtilmemiş',
    '00000000000',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
