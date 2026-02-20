/*
  # Fix duplicate/stale transaction creation from donations

  ## Problem
  The create_transaction_from_donation trigger only inserts when no transaction exists.
  When a donation is updated (amount/purpose changed), the existing transaction is
  never updated, leading to stale/incorrect data.

  ## Fix
  - If transaction exists for this donation: UPDATE it
  - If not: INSERT new transaction
  - Trigger fires on both INSERT and UPDATE
*/

CREATE OR REPLACE FUNCTION create_transaction_from_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  donor_description text;
  transaction_creator_id uuid;
  existing_transaction_id uuid;
BEGIN
  IF NEW.member_id IS NOT NULL THEN
    SELECT full_name INTO donor_description
    FROM public.members
    WHERE id = NEW.member_id;
  ELSE
    donor_description := NEW.donor_name;
  END IF;

  SELECT id INTO transaction_creator_id
  FROM public.members
  WHERE auth_id = auth.uid()
  LIMIT 1;

  -- Check if transaction already exists for this donation
  SELECT id INTO existing_transaction_id
  FROM public.transactions
  WHERE related_donation_id = NEW.id
  LIMIT 1;

  IF existing_transaction_id IS NOT NULL THEN
    -- Update existing transaction
    UPDATE public.transactions SET
      amount = NEW.amount,
      description = 'Bağış - ' || COALESCE(donor_description, 'Anonim') ||
        CASE
          WHEN NEW.purpose IS NOT NULL AND NEW.purpose != ''
          THEN ' (' || NEW.purpose || ')'
          ELSE ''
        END,
      transaction_date = NEW.donation_date,
      member_id = NEW.member_id,
      payment_method = COALESCE(NEW.payment_method, 'cash'),
      updated_at = NOW()
    WHERE id = existing_transaction_id;
  ELSE
    -- Insert new transaction
    INSERT INTO public.transactions (
      type,
      amount,
      description,
      transaction_date,
      category_id,
      member_id,
      related_donation_id,
      payment_method,
      created_by
    )
    VALUES (
      'income',
      NEW.amount,
      'Bağış - ' || COALESCE(donor_description, 'Anonim') ||
        CASE
          WHEN NEW.purpose IS NOT NULL AND NEW.purpose != ''
          THEN ' (' || NEW.purpose || ')'
          ELSE ''
        END,
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
$$;

-- Ensure trigger fires on UPDATE as well (not just INSERT)
DROP TRIGGER IF EXISTS create_transaction_from_donation_trigger ON public.donations;
CREATE TRIGGER create_transaction_from_donation_trigger
  AFTER INSERT OR UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_from_donation();
