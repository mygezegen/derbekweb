/*
  # Fix Security and Performance Issues

  ## Changes Made

  1. **Performance Improvements**
     - Add missing index on `email_logs.sent_by` foreign key
     - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()` to prevent re-evaluation per row

  2. **Security Fixes**
     - Fix `email_logs` INSERT policy that was always true
     - Add security definer and proper search_path to all functions

  ## Tables Updated
     - members (3 policies)
     - audit_logs (1 policy)
     - contact_info (2 policies)
     - management_info (3 policies)
     - page_settings (2 policies)
     - smtp_settings (4 policies)
     - board_members (4 policies)
     - galleries (1 policy)
     - email_templates (1 policy)
     - email_logs (2 policies)

  ## Functions Updated
     - update_page_settings_updated_at
     - log_action
     - update_email_template_updated_at
*/

-- Add missing index on email_logs.sent_by
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON public.email_logs(sent_by);

-- Drop and recreate all affected RLS policies with optimized auth checks

-- Members table policies
DROP POLICY IF EXISTS "Users can create own member profile" ON public.members;
CREATE POLICY "Users can create own member profile"
  ON public.members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can create member profiles" ON public.members;
CREATE POLICY "Admins can create member profiles"
  ON public.members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update all members" ON public.members;
CREATE POLICY "Admins can update all members"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- Audit logs policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- Contact info policies
DROP POLICY IF EXISTS "Admins can insert contact info" ON public.contact_info;
CREATE POLICY "Admins can insert contact info"
  ON public.contact_info
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update contact info" ON public.contact_info;
CREATE POLICY "Admins can update contact info"
  ON public.contact_info
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- Management info policies
DROP POLICY IF EXISTS "Admins can insert management info" ON public.management_info;
CREATE POLICY "Admins can insert management info"
  ON public.management_info
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update management info" ON public.management_info;
CREATE POLICY "Admins can update management info"
  ON public.management_info
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete management info" ON public.management_info;
CREATE POLICY "Admins can delete management info"
  ON public.management_info
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- Page settings policies
DROP POLICY IF EXISTS "Admins can update page settings" ON public.page_settings;
CREATE POLICY "Admins can update page settings"
  ON public.page_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert page settings" ON public.page_settings;
CREATE POLICY "Admins can insert page settings"
  ON public.page_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- SMTP settings policies
DROP POLICY IF EXISTS "Admins can view SMTP settings" ON public.smtp_settings;
CREATE POLICY "Admins can view SMTP settings"
  ON public.smtp_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert SMTP settings" ON public.smtp_settings;
CREATE POLICY "Admins can insert SMTP settings"
  ON public.smtp_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update SMTP settings" ON public.smtp_settings;
CREATE POLICY "Admins can update SMTP settings"
  ON public.smtp_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete SMTP settings" ON public.smtp_settings;
CREATE POLICY "Admins can delete SMTP settings"
  ON public.smtp_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- Board members policies
DROP POLICY IF EXISTS "Admins can view all board members" ON public.board_members;
CREATE POLICY "Admins can view all board members"
  ON public.board_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert board members" ON public.board_members;
CREATE POLICY "Admins can insert board members"
  ON public.board_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update board members" ON public.board_members;
CREATE POLICY "Admins can update board members"
  ON public.board_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete board members" ON public.board_members;
CREATE POLICY "Admins can delete board members"
  ON public.board_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- Galleries policies
DROP POLICY IF EXISTS "Admins can view all galleries" ON public.galleries;
CREATE POLICY "Admins can view all galleries"
  ON public.galleries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- Email templates policies
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- Email logs policies - Fix the always true policy
DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;
CREATE POLICY "System can insert email logs"
  ON public.email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sent_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
CREATE POLICY "Admins can view email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (select auth.uid()) AND is_admin = true
    )
  );

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.update_page_settings_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_action(
  p_table_name text,
  p_record_id uuid,
  p_action text,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_member_id uuid;
BEGIN
  SELECT id INTO v_member_id
  FROM members
  WHERE auth_id = auth.uid();

  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    created_by
  ) VALUES (
    p_table_name,
    p_record_id,
    p_action,
    p_old_data,
    p_new_data,
    v_member_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_email_template_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;