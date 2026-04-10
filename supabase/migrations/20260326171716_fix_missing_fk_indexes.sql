/*
  # Fix Missing Foreign Key Indexes

  Adds covering indexes for all foreign keys that are missing them.
  This improves query performance when joining or filtering by these columns.

  Tables affected:
  - api_clients: created_by, template_id
  - event_participants: checked_in_by
  - identity_verification_requests: verified_by
  - inventory_assignments: created_by
  - inventory_categories: parent_id
  - inventory_event_usage: created_by, event_id
  - inventory_items: created_by
  - inventory_maintenance: reported_by, resolved_by
  - query_response_templates: created_by
  - social_monitor_accounts: created_by
  - social_monitor_keywords: created_by
  - social_monitor_reports: created_by
  - surveys: created_by
*/

CREATE INDEX IF NOT EXISTS idx_api_clients_created_by ON public.api_clients(created_by);
CREATE INDEX IF NOT EXISTS idx_api_clients_template_id ON public.api_clients(template_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_checked_in_by ON public.event_participants(checked_in_by);
CREATE INDEX IF NOT EXISTS idx_identity_verification_verified_by ON public.identity_verification_requests(verified_by);
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_created_by ON public.inventory_assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_categories_parent_id ON public.inventory_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_inventory_event_usage_created_by ON public.inventory_event_usage(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_event_usage_event_id ON public.inventory_event_usage(event_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by ON public.inventory_items(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_maintenance_reported_by ON public.inventory_maintenance(reported_by);
CREATE INDEX IF NOT EXISTS idx_inventory_maintenance_resolved_by ON public.inventory_maintenance(resolved_by);
CREATE INDEX IF NOT EXISTS idx_query_response_templates_created_by ON public.query_response_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_social_monitor_accounts_created_by ON public.social_monitor_accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_social_monitor_keywords_created_by ON public.social_monitor_keywords(created_by);
CREATE INDEX IF NOT EXISTS idx_social_monitor_reports_created_by ON public.social_monitor_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_surveys_created_by ON public.surveys(created_by);
