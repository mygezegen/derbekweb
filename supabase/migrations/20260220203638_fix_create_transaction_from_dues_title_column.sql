/*
  # Fix create_transaction_from_dues function

  ## Problem
  The function tries to SELECT 'title' from transaction_categories table,
  but that column doesn't exist (it's 'name'). This causes a 400 error
  when saving a dues payment.

  ## Fix
  Correct the SELECT to only get 'id' from transaction_categories,
  and get dues title separately from the dues table.
*/

CREATE OR REPLACE FUNCTION create_transaction_from_dues()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  aidat_category_id uuid;
  transaction_creator_id uuid;
  member_full_name text;
  existing_transaction_id uuid;
  dues_title text;
BEGIN
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid' OR (OLD.paid_amount IS NULL OR NEW.paid_amount > COALESCE(OLD.paid_amount, 0))) THEN

    SELECT id INTO transaction_creator_id
    FROM public.members
    WHERE auth_id = auth.uid()
    LIMIT 1;

    SELECT full_name INTO member_full_name
    FROM public.members
    WHERE id = NEW.member_id
    LIMIT 1;

    SELECT id INTO aidat_category_id
    FROM public.transaction_categories
    WHERE name = 'Aidat Gelirleri'
    LIMIT 1;

    IF aidat_category_id IS NULL THEN
      INSERT INTO public.transaction_categories (name, type, description, is_active)
      VALUES ('Aidat Gelirleri', 'income', 'Üye aidatlarından gelen gelirler', true)
      RETURNING id INTO aidat_category_id;
    END IF;

    SELECT title INTO dues_title
    FROM public.dues
    WHERE id = NEW.dues_id;

    SELECT id INTO existing_transaction_id
    FROM public.transactions
    WHERE reference_number = 'DUES-' || NEW.id::text
    LIMIT 1;

    IF existing_transaction_id IS NOT NULL THEN
      UPDATE public.transactions SET
        amount = NEW.paid_amount,
        description = 'Aidat ödemesi - ' || COALESCE(dues_title, '') || ' (' || COALESCE(member_full_name, 'Üye') || ')',
        transaction_date = COALESCE(NEW.paid_at, NOW()),
        payment_method = COALESCE(NEW.payment_method, 'cash'),
        updated_at = NOW()
      WHERE id = existing_transaction_id;
    ELSE
      INSERT INTO public.transactions (
        type,
        amount,
        description,
        transaction_date,
        category_id,
        member_id,
        related_dues_id,
        created_by,
        payment_method,
        reference_number
      )
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
$$;
