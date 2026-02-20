/*
  # Fix Duplicate Donation Transactions

  This migration fixes the issue where donations appear twice in the treasury management.

  ## Problem
  - Donations were being inserted into transactions table multiple times
  - The trigger was not checking for existing transactions

  ## Solution
  - Add unique constraint to prevent duplicate transactions for same donation
  - Update trigger to check for existing transaction before inserting
  - Clean up any existing duplicate transactions

  ## Changes
  1. Add unique constraint on related_donation_id
  2. Update trigger function to prevent duplicates
  3. Clean up duplicate records
*/

-- =====================================================
-- 1. CLEAN UP DUPLICATE TRANSACTIONS
-- =====================================================

-- First, identify and delete duplicate donation transactions
-- Keep only the oldest transaction for each donation (by created_at)
WITH ranked_transactions AS (
  SELECT 
    id,
    related_donation_id,
    ROW_NUMBER() OVER (
      PARTITION BY related_donation_id 
      ORDER BY created_at ASC
    ) as rn
  FROM public.transactions
  WHERE related_donation_id IS NOT NULL
)
DELETE FROM public.transactions
WHERE id IN (
  SELECT id 
  FROM ranked_transactions 
  WHERE rn > 1
);

-- =====================================================
-- 2. ADD UNIQUE CONSTRAINT
-- =====================================================

-- Drop existing constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_donation_transaction'
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE public.transactions DROP CONSTRAINT unique_donation_transaction;
  END IF;
END $$;

-- Add unique constraint to prevent duplicate transactions for same donation
ALTER TABLE public.transactions
ADD CONSTRAINT unique_donation_transaction
UNIQUE (related_donation_id);

-- =====================================================
-- 3. UPDATE TRIGGER FUNCTION
-- =====================================================

-- Update the function to check for existing transaction before inserting
CREATE OR REPLACE FUNCTION public.create_transaction_from_donation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  donor_description text;
  transaction_creator_id uuid;
  existing_transaction_count int;
BEGIN
  -- Check if transaction already exists for this donation
  SELECT COUNT(*) INTO existing_transaction_count
  FROM public.transactions
  WHERE related_donation_id = NEW.id;

  -- Only create transaction if it doesn't already exist
  IF existing_transaction_count = 0 THEN
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

    -- Create transaction
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

-- Recreate trigger (only on INSERT, not UPDATE)
DROP TRIGGER IF EXISTS create_transaction_from_donation_trigger ON public.donations;
CREATE TRIGGER create_transaction_from_donation_trigger
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_transaction_from_donation();