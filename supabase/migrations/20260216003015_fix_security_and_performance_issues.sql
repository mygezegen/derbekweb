/*
  # Fix Security and Performance Issues

  ## Changes Made

  1. **Add Missing Index**
     - Add index on `email_logs.sent_by` foreign key for better performance

  2. **Optimize RLS Policies for Performance**
     - Replace `auth.uid()` with `(select auth.uid())` in all policies
     - This prevents re-evaluation of auth functions for each row
     - Applies to all tables with auth-based policies

  3. **Fix Insecure RLS Policy**
     - Remove overly permissive policy on `email_logs` table
     - Replace with proper authenticated-only policy

  4. **Fix Function Search Paths**
     - Set search_path to empty for security functions
     - Prevents search path manipulation attacks

  5. **Consolidate Duplicate Permissive Policies**
     - Simplify tables with multiple permissive SELECT policies
     - Maintain same access patterns with cleaner implementation

  ## Security Notes
  - All policies now use optimized auth function calls
  - No policies allow unrestricted access
  - Functions are protected against search path attacks
  - Foreign key lookups are now indexed for performance
*/

-- 1. Add missing index for email_logs.sent_by foreign key
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by_fkey ON email_logs(sent_by);

-- 2. Fix search paths for functions
ALTER FUNCTION update_page_settings_updated_at() SET search_path = '';
ALTER FUNCTION update_email_template_updated_at() SET search_path = '';
ALTER FUNCTION log_action(p_table_name text, p_record_id uuid, p_action text, p_old_data jsonb, p_new_data jsonb) SET search_path = '';
ALTER FUNCTION log_action(p_member_id uuid, p_action_type text, p_table_name text, p_record_id uuid, p_old_values jsonb, p_new_values jsonb) SET search_path = '';

-- 3. Drop and recreate RLS policies with optimized auth calls

-- Members table policies
DROP POLICY IF EXISTS "Users can create own member profile" ON members;
DROP POLICY IF EXISTS "Admins can create member profiles" ON members;
DROP POLICY IF EXISTS "Admins can update all members" ON members;

CREATE POLICY "Users can create own member profile"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = (select auth.uid()));

CREATE POLICY "Admins can create member profiles"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update all members"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

-- Audit logs policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

-- Contact info policies
DROP POLICY IF EXISTS "Admins can insert contact info" ON contact_info;
DROP POLICY IF EXISTS "Admins can update contact info" ON contact_info;

CREATE POLICY "Admins can insert contact info"
  ON contact_info FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update contact info"
  ON contact_info FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

-- Management info policies
DROP POLICY IF EXISTS "Admins can insert management info" ON management_info;
DROP POLICY IF EXISTS "Admins can update management info" ON management_info;
DROP POLICY IF EXISTS "Admins can delete management info" ON management_info;

CREATE POLICY "Admins can insert management info"
  ON management_info FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update management info"
  ON management_info FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete management info"
  ON management_info FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

-- Page settings policies
DROP POLICY IF EXISTS "Admins can update page settings" ON page_settings;
DROP POLICY IF EXISTS "Admins can insert page settings" ON page_settings;

CREATE POLICY "Admins can update page settings"
  ON page_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert page settings"
  ON page_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

-- SMTP settings policies
DROP POLICY IF EXISTS "Admins can view SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can insert SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can update SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can delete SMTP settings" ON smtp_settings;

CREATE POLICY "Admins can view SMTP settings"
  ON smtp_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert SMTP settings"
  ON smtp_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update SMTP settings"
  ON smtp_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete SMTP settings"
  ON smtp_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

-- Board members policies
DROP POLICY IF EXISTS "Admins can view all board members" ON board_members;
DROP POLICY IF EXISTS "Admins can insert board members" ON board_members;
DROP POLICY IF EXISTS "Admins can update board members" ON board_members;
DROP POLICY IF EXISTS "Admins can delete board members" ON board_members;

CREATE POLICY "Admins can manage board members"
  ON board_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

-- Galleries policies
DROP POLICY IF EXISTS "Admins can view all galleries" ON galleries;

CREATE POLICY "Admins can view all galleries"
  ON galleries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

-- Email templates policies
DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates;

CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

-- Email logs policies - Fix insecure policy
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;
DROP POLICY IF EXISTS "System can insert email logs" ON email_logs;

CREATE POLICY "Admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Authenticated can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    sent_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = (select auth.uid())
      AND is_admin = true
    )
  );