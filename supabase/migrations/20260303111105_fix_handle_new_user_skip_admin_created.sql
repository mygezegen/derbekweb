/*
  # Fix handle_new_user trigger - skip when admin creates user via service role

  When create-member edge function creates a user via admin API, the trigger
  fires and tries to insert a member record. But create-member also tries to
  insert/update the member record, causing conflicts.

  Fix: The trigger should NOT create a new member record when the user is
  created by the service role (admin API). The edge function handles member
  creation itself.

  Also fix: when no member exists and we create via trigger, ensure phone
  and email defaults are safe.
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
    -- Only create placeholder if this is a self-signup (not admin-created)
    -- Admin-created users have confirmed_at already set (email_confirm: true)
    -- and raw_app_meta_data->>'provider' may differ.
    -- We skip auto-creation here; the create-member edge function handles it.
    IF NEW.raw_app_meta_data->>'provider' = 'email' 
       AND (NEW.email_confirmed_at IS NULL OR NEW.raw_user_meta_data->>'skip_trigger' IS NULL) 
       AND NEW.raw_app_meta_data->>'admin_created' IS NULL THEN
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
  END IF;

  RETURN NEW;
END;
$$;
