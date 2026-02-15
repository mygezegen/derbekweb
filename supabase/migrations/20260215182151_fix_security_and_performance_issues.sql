/*
  # Fix Security and Performance Issues

  ## 1. Add Missing Foreign Key Indexes
  Adds indexes for all foreign key columns to improve query performance:
    - announcements.created_by
    - dues.created_by
    - events.created_by
    - galleries.created_by
    - gallery_images.created_by
    - notification_recipients.member_id
    - notification_recipients.notification_id
    - notifications.sent_by

  ## 2. Optimize RLS Policies
  Updates all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
  This prevents re-evaluation of auth functions for each row, significantly improving performance at scale.

  ## 3. Fix Function Search Paths
  Sets explicit search_path for security functions to prevent search_path injection attacks.

  ## 4. Consolidate Multiple Permissive Policies
  Merges multiple permissive SELECT policies into single policies where appropriate.

  ## 5. Remove Unused Indexes
  Drops indexes that are not being used by queries.
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_dues_created_by ON dues(created_by);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_galleries_created_by ON galleries(created_by);
CREATE INDEX IF NOT EXISTS idx_gallery_images_created_by ON gallery_images(created_by);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_member_id_fkey ON notification_recipients(member_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification_id_fkey ON notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_by ON notifications(sent_by);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - ANNOUNCEMENTS
-- =====================================================

DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;

CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - EVENTS
-- =====================================================

DROP POLICY IF EXISTS "Admins can create events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

CREATE POLICY "Admins can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - ADMIN_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Only first admin can update settings" ON admin_settings;

CREATE POLICY "Only first admin can update settings"
  ON admin_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - DUES
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert dues" ON dues;
DROP POLICY IF EXISTS "Admins can update dues" ON dues;
DROP POLICY IF EXISTS "Admins can delete dues" ON dues;

CREATE POLICY "Admins can insert dues"
  ON dues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update dues"
  ON dues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete dues"
  ON dues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - MEMBER_DUES
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert member dues" ON member_dues;
DROP POLICY IF EXISTS "Admins can update member dues" ON member_dues;
DROP POLICY IF EXISTS "Admins can delete member dues" ON member_dues;
DROP POLICY IF EXISTS "Members can view own dues" ON member_dues;

CREATE POLICY "Admins can insert member dues"
  ON member_dues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update member dues"
  ON member_dues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete member dues"
  ON member_dues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Members can view own dues"
  ON member_dues FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = (select auth.uid())
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - GALLERIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert galleries" ON galleries;
DROP POLICY IF EXISTS "Admins can update galleries" ON galleries;
DROP POLICY IF EXISTS "Admins can delete galleries" ON galleries;
DROP POLICY IF EXISTS "Public galleries viewable by all" ON galleries;

CREATE POLICY "Admins can insert galleries"
  ON galleries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update galleries"
  ON galleries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete galleries"
  ON galleries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Public galleries viewable by all"
  ON galleries FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - GALLERY_IMAGES
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can update gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Gallery images viewable based on gallery visibility" ON gallery_images;

CREATE POLICY "Admins can insert gallery images"
  ON gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update gallery images"
  ON gallery_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete gallery images"
  ON gallery_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Gallery images viewable based on gallery visibility"
  ON gallery_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM galleries
      WHERE galleries.id = gallery_images.gallery_id
      AND (
        galleries.is_public = true OR
        EXISTS (
          SELECT 1 FROM members
          WHERE members.auth_id = (select auth.uid())
          AND members.is_admin = true
        )
      )
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - MEMBERS
-- =====================================================

DROP POLICY IF EXISTS "Members can update own profile" ON members;

CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  TO authenticated
  USING (auth_id = (select auth.uid()))
  WITH CHECK (auth_id = (select auth.uid()));

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - EVENT_PARTICIPANTS
-- =====================================================

DROP POLICY IF EXISTS "Members can manage own participation" ON event_participants;
DROP POLICY IF EXISTS "Members can update own participation" ON event_participants;
DROP POLICY IF EXISTS "Members can delete own participation" ON event_participants;

CREATE POLICY "Members can manage own participation"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = (select auth.uid())
    )
  );

CREATE POLICY "Members can update own participation"
  ON event_participants FOR UPDATE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = (select auth.uid())
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = (select auth.uid())
    )
  );

CREATE POLICY "Members can delete own participation"
  ON event_participants FOR DELETE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = (select auth.uid())
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - NOTIFICATIONS
-- =====================================================

DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - NOTIFICATION_RECIPIENTS
-- =====================================================

-- Drop all existing policies and create consolidated ones
DROP POLICY IF EXISTS "Admins can manage notification recipients" ON notification_recipients;
DROP POLICY IF EXISTS "Admins can view all notification recipients" ON notification_recipients;
DROP POLICY IF EXISTS "Members can view their own notification recipients" ON notification_recipients;

-- Consolidated SELECT policy (fixes multiple permissive policies issue)
CREATE POLICY "View notification recipients"
  ON notification_recipients FOR SELECT
  TO authenticated
  USING (
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
    OR
    -- Members can view their own
    member_id IN (
      SELECT id FROM members WHERE auth_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert notification recipients"
  ON notification_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update notification recipients"
  ON notification_recipients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete notification recipients"
  ON notification_recipients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - DONATIONS
-- =====================================================

-- Drop all existing policies and create consolidated ones
DROP POLICY IF EXISTS "Admins can view all donations" ON donations;
DROP POLICY IF EXISTS "Members can view own donations" ON donations;
DROP POLICY IF EXISTS "Admins can create donations" ON donations;
DROP POLICY IF EXISTS "Admins can update donations" ON donations;
DROP POLICY IF EXISTS "Admins can delete donations" ON donations;

-- Consolidated SELECT policy (fixes multiple permissive policies issue)
CREATE POLICY "View donations"
  ON donations FOR SELECT
  TO authenticated
  USING (
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
    OR
    -- Members can view their own
    member_id IN (
      SELECT id FROM members WHERE auth_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete donations"
  ON donations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
  );

-- =====================================================
-- 3. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Update make_first_member_admin function with secure search_path
CREATE OR REPLACE FUNCTION public.make_first_member_admin()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM members WHERE is_admin = true) = 0 THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Update create_member_dues_for_all function with secure search_path
CREATE OR REPLACE FUNCTION public.create_member_dues_for_all()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO member_dues (member_id, dues_id, amount_due)
  SELECT id, NEW.id, NEW.amount
  FROM members
  WHERE is_active = true;
  
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_members_registry_number;
DROP INDEX IF EXISTS idx_member_dues_dues_id;
DROP INDEX IF EXISTS idx_event_participants_member_id;
DROP INDEX IF EXISTS idx_members_tc_identity;
DROP INDEX IF EXISTS idx_members_is_active;
DROP INDEX IF EXISTS idx_members_member_type;
DROP INDEX IF EXISTS idx_members_province_district;
DROP INDEX IF EXISTS idx_donations_member_id;
DROP INDEX IF EXISTS idx_donations_created_by;