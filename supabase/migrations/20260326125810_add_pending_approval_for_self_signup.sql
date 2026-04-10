/*
  # Harici Form Üye Kaydı - Admin Onay Sistemi

  ## Özet
  Harici form (Signup sayfası) üzerinden kaydolan üyelerin admin onayı olmadan
  sisteme aktif olarak giremeyeceği bir onay mekanizması eklenir.

  ## Yeni Kolonlar
  - `members.pending_approval` (boolean, DEFAULT false)
    - Harici kayıtta TRUE olarak set edilir
    - Admin onayladığında FALSE'a çekilir
    - is_active bu aşamada FALSE kalır

  ## Trigger Güncellenmesi
  - handle_new_user() trigger'ı: harici kayıtta is_active=false, pending_approval=true

  ## Güvenlik
  - RLS zaten aktif
  - Admin update policy mevcut
*/

-- 1. Kolonu ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'pending_approval'
  ) THEN
    ALTER TABLE public.members ADD COLUMN pending_approval boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. Trigger fonksiyonunu güncelle: harici kayıtta is_active=false, pending_approval=true
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_member_id uuid;
BEGIN
  -- Aynı e-posta ile kayıtlı üye var mı?
  SELECT id INTO v_existing_member_id
  FROM public.members
  WHERE email = NEW.email
  LIMIT 1;

  IF v_existing_member_id IS NOT NULL THEN
    -- Üye zaten var: sadece auth_id bağla
    UPDATE public.members
    SET auth_id = NEW.id
    WHERE id = v_existing_member_id
      AND (auth_id IS NULL OR auth_id != NEW.id);
  ELSE
    -- Harici self-signup (admin tarafından oluşturulmamış)
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
        is_admin,
        is_active,
        pending_approval
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
        false,
        false,         -- Admin onaylanana kadar pasif
        true           -- Onay bekleniyor
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
