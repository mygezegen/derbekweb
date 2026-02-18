/*
  # Fix Security and Performance Issues

  This migration addresses multiple security and performance issues:

  ## 1. Add Missing Foreign Key Indexes
    - Add indexes for transactions table foreign keys (created_by, related_donation_id, related_dues_id)

  ## 2. Optimize RLS Policies (Auth Function Initialization)
    - Replace `auth.uid()` with `(SELECT auth.uid())` in all RLS policies
    - This prevents re-evaluation for each row, improving performance at scale

  ## 3. Remove Duplicate Indexes
    - Drop duplicate index `idx_email_logs_sent_by_fkey` (keep `idx_email_logs_sent_by`)

  ## 4. Add RLS Policies for password_reset_tokens
    - Add necessary policies for password reset functionality

  ## 5. Fix Function Search Paths
    - Set immutable search_path for all functions to prevent security vulnerabilities

  ## 6. Consolidate Multiple Permissive Policies
    - Merge overlapping policies into single, efficient policies
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_created_by_fk 
  ON public.transactions(created_by);

CREATE INDEX IF NOT EXISTS idx_transactions_related_donation_id_fk 
  ON public.transactions(related_donation_id);

CREATE INDEX IF NOT EXISTS idx_transactions_related_dues_id_fk 
  ON public.transactions(related_dues_id);

-- =====================================================
-- 2. REMOVE DUPLICATE INDEXES
-- =====================================================

DROP INDEX IF EXISTS public.idx_email_logs_sent_by_fkey;

-- =====================================================
-- 3. FIX RLS POLICIES - OPTIMIZE AUTH FUNCTION CALLS
-- =====================================================

-- Members table policies
DROP POLICY IF EXISTS "Admins and root can update member info" ON public.members;
CREATE POLICY "Admins and root can update member info"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.auth_id = (SELECT auth.uid())
      AND (m.is_admin = true OR m.is_root = true)
    )
  );

-- Gallery comments policies
DROP POLICY IF EXISTS "Authenticated members can create comments" ON public.gallery_comments;
CREATE POLICY "Authenticated members can create comments"
  ON public.gallery_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM public.members 
      WHERE auth_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can delete own comments" ON public.gallery_comments;
CREATE POLICY "Members can delete own comments"
  ON public.gallery_comments
  FOR DELETE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM public.members 
      WHERE auth_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can update own comments" ON public.gallery_comments;
CREATE POLICY "Members can update own comments"
  ON public.gallery_comments
  FOR UPDATE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM public.members 
      WHERE auth_id = (SELECT auth.uid())
    )
  );

-- Permissions policies
DROP POLICY IF EXISTS "Only root can manage permissions" ON public.permissions;
CREATE POLICY "Root can manage permissions"
  ON public.permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid()) AND is_root = true
    )
  );

-- Role permissions policies
DROP POLICY IF EXISTS "Only root can manage role permissions" ON public.role_permissions;
CREATE POLICY "Root can manage role permissions"
  ON public.role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid()) AND is_root = true
    )
  );

-- Transaction categories policies
DROP POLICY IF EXISTS "Admins can manage transaction categories" ON public.transaction_categories;
CREATE POLICY "Admins manage transaction categories"
  ON public.transaction_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid())
      AND (is_admin = true OR is_root = true)
    )
  );

-- Transactions policies
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
CREATE POLICY "Admins manage all transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid())
      AND (is_admin = true OR is_root = true)
    )
  );

DROP POLICY IF EXISTS "Members can view their own transactions" ON public.transactions;
CREATE POLICY "Members view their own transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM public.members 
      WHERE auth_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid())
      AND (is_admin = true OR is_root = true)
    )
  );

-- Treasury summary policies
DROP POLICY IF EXISTS "Admins can view treasury summary" ON public.treasury_summary;
CREATE POLICY "Admins view treasury summary"
  ON public.treasury_summary
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid())
      AND (is_admin = true OR is_root = true)
    )
  );

-- =====================================================
-- 4. ADD RLS POLICIES FOR password_reset_tokens
-- =====================================================

CREATE POLICY "Service role can manage password reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 5. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- cleanup_expired_password_reset_tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now();
END;
$$;

-- update_gallery_comments_updated_at
CREATE OR REPLACE FUNCTION public.update_gallery_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_gallery_comments_updated_at ON public.gallery_comments;
CREATE TRIGGER update_gallery_comments_updated_at
  BEFORE UPDATE ON public.gallery_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gallery_comments_updated_at();

-- check_root_only_fields
CREATE OR REPLACE FUNCTION public.check_root_only_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_member_id uuid;
  is_root_user boolean;
BEGIN
  SELECT id, is_root INTO current_member_id, is_root_user
  FROM public.members
  WHERE auth_id = auth.uid();

  IF (NEW.is_root IS DISTINCT FROM OLD.is_root) AND NOT is_root_user THEN
    RAISE EXCEPTION 'Only root users can modify is_root field';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_root_only_fields_trigger ON public.members;
CREATE TRIGGER check_root_only_fields_trigger
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_root_only_fields();

-- has_permission
CREATE OR REPLACE FUNCTION public.has_permission(permission_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role text;
  has_perm boolean;
BEGIN
  SELECT role INTO user_role
  FROM public.members
  WHERE auth_id = auth.uid();

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE rp.role = user_role
    AND p.code = permission_code
  ) INTO has_perm;

  RETURN has_perm;
END;
$$;

-- update_role_permissions_updated_at
CREATE OR REPLACE FUNCTION public.update_role_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_role_permissions_updated_at();

-- update_treasury_summary
CREATE OR REPLACE FUNCTION public.update_treasury_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_income numeric;
  total_expense numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_income
  FROM public.transactions
  WHERE type = 'income';

  SELECT COALESCE(SUM(amount), 0) INTO total_expense
  FROM public.transactions
  WHERE type = 'expense';

  DELETE FROM public.treasury_summary WHERE id = 1;
  
  INSERT INTO public.treasury_summary (id, total_income, total_expense, balance, last_updated)
  VALUES (1, total_income, total_expense, total_income - total_expense, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_treasury_on_transaction ON public.transactions;
CREATE TRIGGER update_treasury_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.update_treasury_summary();

-- update_transaction_timestamp
CREATE OR REPLACE FUNCTION public.update_transaction_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_transaction_timestamp ON public.transactions;
CREATE TRIGGER update_transaction_timestamp
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transaction_timestamp();

-- create_transaction_from_dues
CREATE OR REPLACE FUNCTION public.create_transaction_from_dues()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    INSERT INTO public.transactions (
      type,
      amount,
      description,
      transaction_date,
      category_id,
      member_id,
      related_dues_id,
      created_by
    )
    SELECT
      'income',
      NEW.paid_amount,
      'Aidat ödemesi - ' || d.title,
      NEW.paid_date,
      (SELECT id FROM public.transaction_categories WHERE name = 'Aidat Gelirleri' LIMIT 1),
      NEW.member_id,
      NEW.dues_id,
      (SELECT id FROM public.members WHERE auth_id = auth.uid() LIMIT 1)
    FROM public.dues d
    WHERE d.id = NEW.dues_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_transaction_from_dues_trigger ON public.member_dues;
CREATE TRIGGER create_transaction_from_dues_trigger
  AFTER INSERT OR UPDATE ON public.member_dues
  FOR EACH ROW
  EXECUTE FUNCTION public.create_transaction_from_dues();

-- create_transaction_from_donation
CREATE OR REPLACE FUNCTION public.create_transaction_from_donation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
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
    'Bağış - ' || COALESCE(NEW.purpose, 'Genel'),
    NEW.donation_date,
    (SELECT id FROM public.transaction_categories WHERE name = 'Bağışlar' LIMIT 1),
    NEW.member_id,
    NEW.id,
    (SELECT id FROM public.members WHERE auth_id = auth.uid() LIMIT 1)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_transaction_from_donation_trigger ON public.donations;
CREATE TRIGGER create_transaction_from_donation_trigger
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_transaction_from_donation();

-- =====================================================
-- 6. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- =====================================================

-- Announcements: Merge duplicate SELECT policies
DROP POLICY IF EXISTS "Members can view all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Public can view active announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Email logs: Merge duplicate INSERT policies
DROP POLICY IF EXISTS "Admins can insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Authenticated can insert email logs" ON public.email_logs;
CREATE POLICY "Authenticated users can insert email logs"
  ON public.email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Events: Merge duplicate SELECT policies
DROP POLICY IF EXISTS "Members can view all events" ON public.events;
DROP POLICY IF EXISTS "Public can view all events" ON public.events;
CREATE POLICY "Anyone can view events"
  ON public.events
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Members UPDATE: Consolidate into one comprehensive policy
DROP POLICY IF EXISTS "Admins and root can update member info" ON public.members;
DROP POLICY IF EXISTS "Admins can update all members" ON public.members;
DROP POLICY IF EXISTS "Members can update own profile" ON public.members;

CREATE POLICY "Members can update profiles"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (
    auth_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.auth_id = (SELECT auth.uid())
      AND (m.is_admin = true OR m.is_root = true)
    )
  )
  WITH CHECK (
    auth_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.auth_id = (SELECT auth.uid())
      AND (m.is_admin = true OR m.is_root = true)
    )
  );

-- Permissions: Merge duplicate SELECT policies
DROP POLICY IF EXISTS "Anyone can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Only root can manage permissions" ON public.permissions;
DROP POLICY IF EXISTS "Root can manage permissions" ON public.permissions;

CREATE POLICY "Anyone can view permissions"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Root can modify permissions"
  ON public.permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid()) AND is_root = true
    )
  );

CREATE POLICY "Root can insert permissions"
  ON public.permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid()) AND is_root = true
    )
  );

CREATE POLICY "Root can delete permissions"
  ON public.permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid()) AND is_root = true
    )
  );

-- Role permissions: Merge duplicate SELECT policies
DROP POLICY IF EXISTS "Anyone can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only root can manage role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Root can manage role permissions" ON public.role_permissions;

CREATE POLICY "Anyone can view role permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Root can modify role permissions"
  ON public.role_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid()) AND is_root = true
    )
  );

CREATE POLICY "Root can insert role permissions"
  ON public.role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid()) AND is_root = true
    )
  );

CREATE POLICY "Root can delete role permissions"
  ON public.role_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid()) AND is_root = true
    )
  );

-- Transaction categories: Merge duplicate SELECT policies
DROP POLICY IF EXISTS "Admins can manage transaction categories" ON public.transaction_categories;
DROP POLICY IF EXISTS "Members can view active transaction categories" ON public.transaction_categories;
DROP POLICY IF EXISTS "Admins manage transaction categories" ON public.transaction_categories;

CREATE POLICY "Members can view transaction categories"
  ON public.transaction_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can modify transaction categories"
  ON public.transaction_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid())
      AND (is_admin = true OR is_root = true)
    )
  );

CREATE POLICY "Admins can insert transaction categories"
  ON public.transaction_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid())
      AND (is_admin = true OR is_root = true)
    )
  );

CREATE POLICY "Admins can delete transaction categories"
  ON public.transaction_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = (SELECT auth.uid())
      AND (is_admin = true OR is_root = true)
    )
  );
