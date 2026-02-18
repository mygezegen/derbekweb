/*
  # Add Non-Member Donation Support

  This migration enables non-members to make donations by:

  ## 1. Add Donor Information Fields
    - Add `donor_name` field for non-member donor names
    - Add `donor_email` field for non-member donor contact
    - Add `donor_phone` field for non-member donor phone
    - Add `purpose` field to specify donation purpose
    - Keep `member_id` nullable for non-member donations

  ## 2. Update RLS Policies
    - Allow anonymous users to insert donations
    - Allow public to view donation statistics (without personal info)

  ## 3. Update Transaction Creation
    - Modify trigger to handle both member and non-member donations
    - Use donor_name when member_id is null

  ## Important Notes
    - member_id is already nullable, so non-members can donate
    - Triggers already exist and will be updated to handle non-member donations
    - Donations automatically create income transactions in treasury
*/

-- =====================================================
-- 1. ADD DONOR INFORMATION FIELDS
-- =====================================================

-- Add donor name for non-member donations
ALTER TABLE public.donations
ADD COLUMN IF NOT EXISTS donor_name text;

-- Add donor email for non-member donations
ALTER TABLE public.donations
ADD COLUMN IF NOT EXISTS donor_email text;

-- Add donor phone for non-member donations
ALTER TABLE public.donations
ADD COLUMN IF NOT EXISTS donor_phone text;

-- Add purpose field if not exists (might already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'purpose'
  ) THEN
    ALTER TABLE public.donations ADD COLUMN purpose text;
  END IF;
END $$;

-- Add constraint: either member_id OR donor_name must be provided
ALTER TABLE public.donations
DROP CONSTRAINT IF EXISTS check_donor_info;

ALTER TABLE public.donations
ADD CONSTRAINT check_donor_info
CHECK (
  member_id IS NOT NULL OR 
  (donor_name IS NOT NULL AND donor_name != '')
);

-- =====================================================
-- 2. UPDATE RLS POLICIES
-- =====================================================

-- Drop all existing donation policies
DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;
DROP POLICY IF EXISTS "Members can view all donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can manage donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can create donations" ON public.donations;
DROP POLICY IF EXISTS "Authenticated users can view donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can update donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can delete donations" ON public.donations;

-- Allow anyone (authenticated or anonymous) to insert donations
CREATE POLICY "Anyone can create donations"
  ON public.donations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Members and admins can view all donations
CREATE POLICY "Authenticated users can view donations"
  ON public.donations
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can update donations
CREATE POLICY "Admins can update donations"
  ON public.donations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid())
      AND (is_admin = true OR is_root = true)
    )
  );

-- Admins can delete donations
CREATE POLICY "Admins can delete donations"
  ON public.donations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid())
      AND (is_admin = true OR is_root = true)
    )
  );

-- =====================================================
-- 3. UPDATE TRANSACTION CREATION TRIGGER
-- =====================================================

-- Update the function to handle non-member donations
CREATE OR REPLACE FUNCTION public.create_transaction_from_donation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  donor_description text;
  transaction_creator_id uuid;
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

  -- Create transaction
  INSERT INTO public.transactions (
    type,
    amount,
    description,
    transaction_date,
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
    (SELECT id FROM public.transaction_categories WHERE name = 'Bağışlar' LIMIT 1),
    NEW.member_id,
    NEW.id,
    transaction_creator_id
  );

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS create_transaction_from_donation_trigger ON public.donations;
CREATE TRIGGER create_transaction_from_donation_trigger
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_transaction_from_donation();

-- =====================================================
-- 4. ENSURE TRANSACTION CATEGORIES EXIST
-- =====================================================

-- Check and insert categories if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.transaction_categories WHERE name = 'Bağışlar') THEN
    INSERT INTO public.transaction_categories (name, type, description, is_active)
    VALUES ('Bağışlar', 'income', 'Üye ve üye olmayan kişilerden gelen bağışlar', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.transaction_categories WHERE name = 'Aidat Gelirleri') THEN
    INSERT INTO public.transaction_categories (name, type, description, is_active)
    VALUES ('Aidat Gelirleri', 'income', 'Üye aidatlarından gelen gelirler', true);
  END IF;
END $$;
