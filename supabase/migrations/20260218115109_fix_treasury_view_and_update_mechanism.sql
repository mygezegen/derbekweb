/*
  # Fix Treasury View and Update Mechanism

  This migration ensures treasury_summary is updated correctly:
  
  ## 1. Fix Treasury Summary Update
    - Ensure treasury_summary updates when transactions are added
    - Create proper trigger for automatic updates
    - Recalculate current balances
    
  ## 2. Fix RLS for Treasury Summary
    - Allow admins to view treasury summary
    
  ## 3. Initial Data Setup
    - Ensure treasury_summary has initial data if empty
*/

-- =====================================================
-- 1. DROP EXISTING TRIGGERS FIRST
-- =====================================================

DROP TRIGGER IF EXISTS update_treasury_summary_trigger ON public.transactions;
DROP TRIGGER IF EXISTS trigger_update_treasury_summary ON public.transactions;
DROP TRIGGER IF EXISTS update_treasury_on_transaction ON public.transactions;

-- Now drop the function with CASCADE
DROP FUNCTION IF EXISTS public.update_treasury_summary() CASCADE;

-- =====================================================
-- 2. RECREATE TREASURY UPDATE FUNCTION
-- =====================================================

-- Create function to update treasury summary
CREATE OR REPLACE FUNCTION public.update_treasury_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update or insert treasury summary
  INSERT INTO public.treasury_summary (
    id,
    total_income,
    total_expense,
    current_balance,
    last_updated
  )
  VALUES (
    '4c91d0ef-8920-4af5-95a9-6bb932c86054',
    (SELECT COALESCE(SUM(amount), 0) FROM public.transactions WHERE type = 'income'),
    (SELECT COALESCE(SUM(amount), 0) FROM public.transactions WHERE type = 'expense'),
    (SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) FROM public.transactions),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_income = (SELECT COALESCE(SUM(amount), 0) FROM public.transactions WHERE type = 'income'),
    total_expense = (SELECT COALESCE(SUM(amount), 0) FROM public.transactions WHERE type = 'expense'),
    current_balance = (SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) FROM public.transactions),
    last_updated = NOW();
    
  RETURN NEW;
END;
$$;

-- Create trigger to update treasury summary
CREATE TRIGGER update_treasury_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.update_treasury_summary();

-- =====================================================
-- 3. FIX TREASURY SUMMARY RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view treasury summary" ON public.treasury_summary;
DROP POLICY IF EXISTS "Admins can update treasury summary" ON public.treasury_summary;
DROP POLICY IF EXISTS "Allow admins to view treasury" ON public.treasury_summary;
DROP POLICY IF EXISTS "Allow system to update treasury" ON public.treasury_summary;

-- Allow admins to view treasury summary
CREATE POLICY "Allow admins to view treasury"
  ON public.treasury_summary
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = auth.uid()
      AND (is_admin = true OR is_root = true)
    )
  );

-- Allow system to update treasury summary
CREATE POLICY "Allow system to update treasury"
  ON public.treasury_summary
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. ENSURE INITIAL TREASURY SUMMARY EXISTS
-- =====================================================

-- Make sure initial treasury summary exists
INSERT INTO public.treasury_summary (
  id,
  total_income,
  total_expense,
  current_balance,
  last_updated
)
VALUES (
  '4c91d0ef-8920-4af5-95a9-6bb932c86054',
  0,
  0,
  0,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. RECALCULATE CURRENT TREASURY SUMMARY
-- =====================================================

-- Update treasury summary with current data
UPDATE public.treasury_summary
SET
  total_income = (SELECT COALESCE(SUM(amount), 0) FROM public.transactions WHERE type = 'income'),
  total_expense = (SELECT COALESCE(SUM(amount), 0) FROM public.transactions WHERE type = 'expense'),
  current_balance = (SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) FROM public.transactions),
  last_updated = NOW()
WHERE id = '4c91d0ef-8920-4af5-95a9-6bb932c86054';
