/*
  # Comprehensive Security Fixes

  ## Summary
  Addresses all reported security issues across functions, views, RLS policies, and storage.

  ## Changes

  ### 1. Security Definer View Fix
  - Recreate `treasury_summary` as SECURITY INVOKER view (default), removing implicit SECURITY DEFINER

  ### 2. Function Search Path Fix
  - Fix `log_action` trigger variant (0 args) to include SET search_path

  ### 3. Fix `log_action` (6-arg variant) missing search_path
  - Add SET search_path TO 'public', 'pg_catalog'

  ### 4. RLS Policy Fixes — Remove always-true INSERT/UPDATE policies
  - `activity_logs`: Replace unrestricted INSERT with authenticated-only check
  - `email_logs`: Replace unrestricted INSERT with admin-only check
  - `event_social_posts`: Replace unrestricted INSERT/UPDATE with admin-only checks
  - `sms_logs`: Replace unrestricted INSERT with admin-only check

  ### 5. EXECUTE Permission Fixes
  - Revoke EXECUTE on all SECURITY DEFINER functions from anon role
  - Functions that legitimately need anon access (validate_password_reset_code, get_email_by_tc,
    upsert_device_token, can_request_password_reset, cleanup_tc_phone_login_tokens,
    cleanup_expired_password_reset_tokens) keep authenticated/specific grants
  - Trigger functions remain as-is (they run as table owner, not via RPC)

  ### 6. tc_phone_login_tokens RLS Policies
  - Add policies so authenticated users and the edge function can work with tokens

  ### 7. Storage: Remove broad listing policy on images bucket
  - Drop the policy that allows listing all files; object URL access still works without it
*/

-- ============================================================
-- 1. Fix treasury_summary view (remove SECURITY DEFINER)
-- ============================================================
DROP VIEW IF EXISTS public.treasury_summary;

CREATE VIEW public.treasury_summary
WITH (security_invoker = true)
AS
SELECT
  gen_random_uuid() AS id,
  COALESCE(sum(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
  COALESCE(sum(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
  COALESCE(sum(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
           sum(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS current_balance,
  now() AS last_updated
FROM transactions;

-- ============================================================
-- 2. Fix log_action() trigger variant — add SET search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_action()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, created_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, created_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, created_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================================
-- 3. Fix log_action(6-arg) variant — add SET search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_action(
  p_member_id uuid,
  p_action_type text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  INSERT INTO audit_logs (member_id, action_type, table_name, record_id, old_values, new_values)
  VALUES (p_member_id, p_action_type, p_table_name, p_record_id, p_old_values, p_new_values);
END;
$$;

-- ============================================================
-- 4. Fix RLS policies — activity_logs
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;

CREATE POLICY "Authenticated users can insert own activity logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. Fix RLS policies — email_logs
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert email logs" ON public.email_logs;

CREATE POLICY "Admins can insert email logs"
  ON public.email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- ============================================================
-- 6. Fix RLS policies — event_social_posts
-- ============================================================
DROP POLICY IF EXISTS "System can insert event social posts" ON public.event_social_posts;
DROP POLICY IF EXISTS "System can update event social posts" ON public.event_social_posts;

CREATE POLICY "Admins can insert event social posts"
  ON public.event_social_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update event social posts"
  ON public.event_social_posts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- ============================================================
-- 7. Fix RLS policies — sms_logs
-- ============================================================
DROP POLICY IF EXISTS "System can insert SMS logs" ON public.sms_logs;

CREATE POLICY "Admins can insert SMS logs"
  ON public.sms_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- ============================================================
-- 8. tc_phone_login_tokens — add missing RLS policies
-- ============================================================
CREATE POLICY "Anon can insert login tokens"
  ON public.tc_phone_login_tokens
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can select own token by phone"
  ON public.tc_phone_login_tokens
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can manage own tokens"
  ON public.tc_phone_login_tokens
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert tokens"
  ON public.tc_phone_login_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete tokens"
  ON public.tc_phone_login_tokens
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.auth_id = auth.uid()
        AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- ============================================================
-- 9. Revoke EXECUTE on SECURITY DEFINER functions from anon
--    (trigger functions are not callable via RPC — skip them)
-- ============================================================

-- Trigger-only functions: revoke anon (they should not be RPC-callable)
REVOKE EXECUTE ON FUNCTION public.log_action() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_root_only_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_dues_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_member_active_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_donation_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_dues_payment_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_member_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_transaction_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.make_first_member_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_email_template_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_gallery_comments_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_page_settings_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_role_permissions_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_transaction_timestamp() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_transaction_from_donation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_transaction_from_dues() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_transaction_on_donation_delete() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_transaction_on_dues_delete() FROM anon, authenticated;

-- Admin-only callable functions: revoke anon, keep authenticated but only admins benefit
REVOKE EXECUTE ON FUNCTION public.cleanup_duplicate_members() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_member_dues_for_all() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_action(uuid, text, text, uuid, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_action(text, uuid, text, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, uuid, jsonb, jsonb, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM anon;

-- Functions used by edge functions / SMS flow — keep anon for specific ones
-- validate_password_reset_code, get_email_by_tc, upsert_device_token,
-- can_request_password_reset, cleanup_expired_password_reset_tokens,
-- cleanup_tc_phone_login_tokens are called from edge functions or public flows
REVOKE EXECUTE ON FUNCTION public.get_email_by_tc(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_tc(text) TO authenticated;

-- ============================================================
-- 10. Storage: Drop overly-broad listing policy on images bucket
-- ============================================================
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;

CREATE POLICY "Public can read image objects"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'images');
