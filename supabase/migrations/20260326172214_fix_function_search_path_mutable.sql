/*
  # Fix Function Search Path Mutable

  Add SET search_path = '' to all functions that have a mutable search_path.
  This prevents potential search path injection attacks.

  Functions fixed:
  - delete_transaction_on_dues_delete
  - handle_dues_status_change
  - delete_transaction_on_donation_delete
  - update_social_media_config_updated_at
  - update_verification_timestamp
  - handle_member_active_status_change
  - can_request_password_reset
  - validate_password_reset_code
  - cleanup_duplicate_members
  - update_surveys_updated_at
  - create_transaction_from_donation
  - create_transaction_from_dues
  - log_action (trigger variant)
*/

CREATE OR REPLACE FUNCTION public.delete_transaction_on_dues_delete()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.transactions WHERE reference_number = 'DUES-' || OLD.id::text;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_dues_status_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    DELETE FROM public.transactions WHERE reference_number = 'DUES-' || NEW.id::text;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_transaction_on_donation_delete()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.transactions WHERE related_donation_id = OLD.id;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_social_media_config_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_verification_timestamp()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_member_active_status_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE public.member_dues
    SET status = 'cancelled', cancelled_at = now(), cancelled_reason = 'Üye pasif statüye alındı'
    WHERE member_id = NEW.id AND status IN ('pending', 'overdue');
  END IF;

  IF OLD.is_active = false AND NEW.is_active = true THEN
    UPDATE public.member_dues
    SET status = 'pending', cancelled_at = NULL, cancelled_reason = NULL
    WHERE member_id = NEW.id AND status = 'cancelled';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_request_password_reset(p_user_id uuid, p_reset_type text)
  RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_last_request timestamptz;
BEGIN
  SELECT last_sent_at INTO v_last_request
  FROM public.password_reset_tokens
  WHERE user_id = p_user_id
    AND reset_type = p_reset_type
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_request IS NULL OR v_last_request < (now() - interval '30 minutes') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_password_reset_code(p_reset_code text, p_phone_number text)
  RETURNS TABLE(user_id uuid, is_valid boolean, error_message text)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_token_record public.password_reset_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_token_record
  FROM public.password_reset_tokens
  WHERE reset_code = p_reset_code
    AND phone_number = p_phone_number
    AND reset_type = 'sms'
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_token_record.id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Geçersiz veya süresi dolmuş kod'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_token_record.user_id, true, NULL::text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_duplicate_members()
  RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS temp_duplicate_mapping AS
  SELECT
    m_null.id as duplicate_id,
    m_with.id as primary_id,
    m_null.email
  FROM public.members m_null
  JOIN public.members m_with ON m_null.email = m_with.email
  WHERE m_null.auth_id IS NULL
    AND m_with.auth_id IS NOT NULL;

  UPDATE public.member_dues md
  SET member_id = tdm.primary_id
  FROM temp_duplicate_mapping tdm
  WHERE md.member_id = tdm.duplicate_id;

  UPDATE public.donations d
  SET member_id = tdm.primary_id
  FROM temp_duplicate_mapping tdm
  WHERE d.member_id = tdm.duplicate_id;

  WITH deleted AS (
    DELETE FROM public.members
    WHERE id IN (SELECT duplicate_id FROM temp_duplicate_mapping)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  DROP TABLE IF EXISTS temp_duplicate_mapping;

  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_surveys_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_transaction_from_donation()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  donor_description text;
  transaction_creator_id uuid;
  existing_transaction_id uuid;
BEGIN
  IF NEW.member_id IS NOT NULL THEN
    SELECT full_name INTO donor_description FROM public.members WHERE id = NEW.member_id;
  ELSE
    donor_description := NEW.donor_name;
  END IF;

  SELECT id INTO transaction_creator_id FROM public.members WHERE auth_id = auth.uid() LIMIT 1;

  SELECT id INTO existing_transaction_id FROM public.transactions WHERE related_donation_id = NEW.id LIMIT 1;

  IF existing_transaction_id IS NOT NULL THEN
    UPDATE public.transactions SET
      amount = NEW.amount,
      description = 'Bağış - ' || COALESCE(donor_description, 'Anonim') ||
        CASE WHEN NEW.purpose IS NOT NULL AND NEW.purpose != '' THEN ' (' || NEW.purpose || ')' ELSE '' END,
      transaction_date = NEW.donation_date,
      member_id = NEW.member_id,
      payment_method = COALESCE(NEW.payment_method, 'cash'),
      updated_at = NOW()
    WHERE id = existing_transaction_id;
  ELSE
    INSERT INTO public.transactions (type, amount, description, transaction_date, category_id, member_id, related_donation_id, payment_method, created_by)
    VALUES (
      'income',
      NEW.amount,
      'Bağış - ' || COALESCE(donor_description, 'Anonim') ||
        CASE WHEN NEW.purpose IS NOT NULL AND NEW.purpose != '' THEN ' (' || NEW.purpose || ')' ELSE '' END,
      NEW.donation_date,
      (SELECT id FROM public.transaction_categories WHERE name = 'Bağışlar' LIMIT 1),
      NEW.member_id,
      NEW.id,
      COALESCE(NEW.payment_method, 'cash'),
      transaction_creator_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_transaction_from_dues()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  aidat_category_id uuid;
  transaction_creator_id uuid;
  member_full_name text;
  existing_transaction_id uuid;
  dues_title text;
BEGIN
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid' OR (OLD.paid_amount IS NULL OR NEW.paid_amount > COALESCE(OLD.paid_amount, 0))) THEN

    SELECT id INTO transaction_creator_id FROM public.members WHERE auth_id = auth.uid() LIMIT 1;
    SELECT full_name INTO member_full_name FROM public.members WHERE id = NEW.member_id LIMIT 1;
    SELECT id INTO aidat_category_id FROM public.transaction_categories WHERE name = 'Aidat Gelirleri' LIMIT 1;

    IF aidat_category_id IS NULL THEN
      INSERT INTO public.transaction_categories (name, type, description, is_active)
      VALUES ('Aidat Gelirleri', 'income', 'Üye aidatlarından gelen gelirler', true)
      RETURNING id INTO aidat_category_id;
    END IF;

    SELECT title INTO dues_title FROM public.dues WHERE id = NEW.dues_id;

    SELECT id INTO existing_transaction_id FROM public.transactions WHERE reference_number = 'DUES-' || NEW.id::text LIMIT 1;

    IF existing_transaction_id IS NOT NULL THEN
      UPDATE public.transactions SET
        amount = NEW.paid_amount,
        description = 'Aidat ödemesi - ' || COALESCE(dues_title, '') || ' (' || COALESCE(member_full_name, 'Üye') || ')',
        transaction_date = COALESCE(NEW.paid_at, NOW()),
        payment_method = COALESCE(NEW.payment_method, 'cash'),
        updated_at = NOW()
      WHERE id = existing_transaction_id;
    ELSE
      INSERT INTO public.transactions (type, amount, description, transaction_date, category_id, member_id, related_dues_id, created_by, payment_method, reference_number)
      VALUES (
        'income',
        NEW.paid_amount,
        'Aidat ödemesi - ' || COALESCE(dues_title, '') || ' (' || COALESCE(member_full_name, 'Üye') || ')',
        COALESCE(NEW.paid_at, NOW()),
        aidat_category_id,
        NEW.member_id,
        NEW.dues_id,
        transaction_creator_id,
        COALESCE(NEW.payment_method, 'cash'),
        'DUES-' || NEW.id::text
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

-- log_action trigger variant (the one without SET search_path already)
CREATE OR REPLACE FUNCTION public.log_action()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, created_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, created_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, created_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;
