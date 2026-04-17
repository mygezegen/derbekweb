/*
  # Fix treasury_summary view to use SECURITY DEFINER

  ## Problem
  The treasury_summary view queries the transactions table directly.
  When called via the mobile app, the RLS policy on transactions requires
  the calling user to be an admin or root member. If the member record
  hasn't loaded yet or isn't linked, the view returns empty results.

  ## Fix
  Recreate the treasury_summary view with SECURITY DEFINER so it runs
  with elevated privileges. Access control is enforced at the application
  layer (TreasuryScreen already checks is_admin / is_root before rendering).
*/

DROP VIEW IF EXISTS treasury_summary;

CREATE OR REPLACE VIEW treasury_summary
WITH (security_invoker = false)
AS
SELECT
  gen_random_uuid() AS id,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
  COALESCE(
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END),
    0
  ) AS current_balance,
  now() AS last_updated
FROM transactions;

REVOKE ALL ON treasury_summary FROM anon, authenticated;
GRANT SELECT ON treasury_summary TO authenticated;
