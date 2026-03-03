/*
  # Fix handle_new_user trigger to prevent duplicate member records

  ## Problem
  When a new auth user is created (e.g., during password reset flow), the
  handle_new_user trigger always inserts a new member record. If a member
  already exists with the same email, this creates a duplicate record with
  fake placeholder data (TC: 00000000000, phone: 00000000000).

  ## Fix
  Update handle_new_user to:
  1. If a member already exists with the same email → just update their auth_id
  2. If no member exists with that email → create a new member record as before
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_member_id uuid;
BEGIN
  -- Check if a member already exists with this email
  SELECT id INTO v_existing_member_id
  FROM public.members
  WHERE email = NEW.email
  LIMIT 1;

  IF v_existing_member_id IS NOT NULL THEN
    -- Member exists: just link the auth_id
    UPDATE public.members
    SET auth_id = NEW.id
    WHERE id = v_existing_member_id
      AND (auth_id IS NULL OR auth_id != NEW.id);
  ELSE
    -- No existing member: create a new placeholder record
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
  END IF;

  RETURN NEW;
END;
$$;
