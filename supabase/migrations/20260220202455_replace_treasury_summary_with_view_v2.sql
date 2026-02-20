/*
  # Replace treasury_summary static table with a dynamic view

  ## Problem
  treasury_summary is a static table that gets out of sync with actual transactions.
  When transactions are added/updated/deleted, the summary doesn't always reflect reality.

  ## Fix
  - Drop all treasury-related triggers and functions with CASCADE
  - Drop the static treasury_summary table
  - Create a view that calculates totals directly from the transactions table

  ## Result
  - treasury_summary view is always accurate
  - No more stale/inconsistent totals
*/

-- Drop all treasury triggers first
DROP TRIGGER IF EXISTS update_treasury_summary_trigger ON public.transactions;
DROP TRIGGER IF EXISTS update_treasury_on_dues_payment ON public.member_dues;
DROP TRIGGER IF EXISTS update_treasury_on_donation ON public.donations;

-- Drop the function with CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS update_treasury_summary() CASCADE;

-- Drop the old static table
DROP TABLE IF EXISTS public.treasury_summary;

-- Create a view that always reflects current transactions
CREATE OR REPLACE VIEW public.treasury_summary AS
SELECT
  gen_random_uuid() AS id,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
  COALESCE(
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END),
    0
  ) AS current_balance,
  NOW() AS last_updated
FROM public.transactions;
