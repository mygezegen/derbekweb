/*
  # Fix Security Definer Views

  Recreate treasury_summary and activity_logs_view without SECURITY DEFINER.
  Views should use SECURITY INVOKER (the default) so they respect the
  row-level security policies of the calling user, not the view owner.
*/

DROP VIEW IF EXISTS public.treasury_summary;
CREATE VIEW public.treasury_summary
  WITH (security_invoker = true)
AS
  SELECT
    gen_random_uuid() AS id,
    COALESCE(sum(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
    COALESCE(sum(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
    COALESCE(
      sum(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
      sum(CASE WHEN type = 'expense' THEN amount ELSE 0 END),
      0
    ) AS current_balance,
    now() AS last_updated
  FROM public.transactions;

DROP VIEW IF EXISTS public.activity_logs_view;
CREATE VIEW public.activity_logs_view
  WITH (security_invoker = true)
AS
  SELECT
    al.id,
    al.action,
    al.entity_type,
    al.entity_id,
    m.full_name AS actor_name,
    m.email AS actor_email,
    al.description,
    al.severity,
    al.created_at,
    al.old_values,
    al.new_values,
    al.metadata
  FROM public.activity_logs al
  LEFT JOIN public.members m ON al.actor_id = m.id
  ORDER BY al.created_at DESC;
