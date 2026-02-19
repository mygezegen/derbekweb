/*
  # Fix Donation Transaction Payment Method

  ## Overview
  Updates the donation-to-transaction trigger to include payment_method field,
  which is required by the transactions table but was missing from the trigger.

  ## Changes
  1. Updates `create_transaction_from_donation()` function to include payment_method
  2. Uses the payment_method from the donation record
  3. Defaults to 'other' if payment_method is null

  ## Security
  - No security changes - maintains existing RLS policies
*/

-- Update the function to include payment_method
CREATE OR REPLACE FUNCTION public.create_transaction_from_donation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  donor_description text;
  transaction_creator_id uuid;
  category_uuid uuid;
BEGIN
  -- Determine donor description
  IF NEW.member_id IS NOT NULL THEN
    SELECT full_name INTO donor_description
    FROM public.members
    WHERE id = NEW.member_id;
  ELSE
    donor_description := NEW.donor_name;
  END IF;

  -- Get creator ID (for authenticated users) or use system user
  SELECT id INTO transaction_creator_id
  FROM public.members
  WHERE auth_id = auth.uid()
  LIMIT 1;

  -- Get category ID for donations
  SELECT id INTO category_uuid
  FROM public.transaction_categories 
  WHERE name = 'Bağışlar' OR name = 'Bağış'
  LIMIT 1;

  -- Create transaction with payment_method
  INSERT INTO public.transactions (
    type,
    amount,
    description,
    transaction_date,
    payment_method,
    category_id,
    member_id,
    related_donation_id,
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
    COALESCE(NEW.payment_method, 'other'),
    category_uuid,
    NEW.member_id,
    NEW.id,
    transaction_creator_id
  );

  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS create_transaction_from_donation_trigger ON public.donations;
CREATE TRIGGER create_transaction_from_donation_trigger
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_transaction_from_donation();