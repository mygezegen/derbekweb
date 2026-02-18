/*
  # Fix Donations and Member Dues RLS Policies

  This migration fixes the RLS policies to allow:
  
  ## 1. Donations
    - Anonymous users can insert donations (non-members)
    - Authenticated admins can insert donations
    - No duplicate policies
    - Proper access control
    
  ## 2. Member Dues
    - Admins can insert/update/delete member dues
    - Members can view their own dues
    - Fix any missing policies
    
  ## 3. Clean Up
    - Remove conflicting policies
    - Ensure single clear policy per action
*/

-- =====================================================
-- 1. FIX DONATIONS POLICIES
-- =====================================================

-- Drop all existing donation policies to start clean
DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can insert donations" ON public.donations;
DROP POLICY IF EXISTS "Members can view all donations" ON public.donations;
DROP POLICY IF EXISTS "View donations" ON public.donations;
DROP POLICY IF EXISTS "Authenticated users can view donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can update donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can delete donations" ON public.donations;

-- Allow EVERYONE (anonymous + authenticated) to insert donations
CREATE POLICY "Allow all to insert donations"
  ON public.donations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins and members can view donations
CREATE POLICY "Allow authenticated to view donations"
  ON public.donations
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = auth.uid()
      AND (is_admin = true OR is_root = true)
    )
    OR
    -- Members can see their own
    member_id IN (
      SELECT id FROM public.members
      WHERE auth_id = auth.uid()
    )
  );

-- Only admins can update donations
CREATE POLICY "Allow admins to update donations"
  ON public.donations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = auth.uid()
      AND (is_admin = true OR is_root = true)
    )
  );

-- Only admins can delete donations
CREATE POLICY "Allow admins to delete donations"
  ON public.donations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = auth.uid()
      AND (is_admin = true OR is_root = true)
    )
  );

-- =====================================================
-- 2. FIX MEMBER DUES POLICIES
-- =====================================================

-- Drop all existing member_dues policies
DROP POLICY IF EXISTS "Admins can insert member dues" ON public.member_dues;
DROP POLICY IF EXISTS "Admins can update member dues" ON public.member_dues;
DROP POLICY IF EXISTS "Admins can delete member dues" ON public.member_dues;
DROP POLICY IF EXISTS "Members can view own dues" ON public.member_dues;

-- Only admins can insert dues
CREATE POLICY "Allow admins to insert dues"
  ON public.member_dues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = auth.uid()
      AND (is_admin = true OR is_root = true)
    )
  );

-- Only admins can update dues
CREATE POLICY "Allow admins to update dues"
  ON public.member_dues
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = auth.uid()
      AND (is_admin = true OR is_root = true)
    )
  );

-- Only admins can delete dues
CREATE POLICY "Allow admins to delete dues"
  ON public.member_dues
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = auth.uid()
      AND (is_admin = true OR is_root = true)
    )
  );

-- Admins and members can view dues
CREATE POLICY "Allow authenticated to view dues"
  ON public.member_dues
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all
    EXISTS (
      SELECT 1 FROM public.members
      WHERE auth_id = auth.uid()
      AND (is_admin = true OR is_root = true)
    )
    OR
    -- Members can see their own
    member_id IN (
      SELECT id FROM public.members
      WHERE auth_id = auth.uid()
    )
  );
