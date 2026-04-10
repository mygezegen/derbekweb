/*
  # Fix RLS Auth Initialization Plan

  Replace auth.uid() with (select auth.uid()) in all RLS policies to prevent
  per-row re-evaluation of the auth function. This significantly improves
  query performance at scale.

  Also removes duplicate policies that have identical logic (keeping the more
  specific/restrictive version of each pair).
*/

-- ============================================================
-- TRANSACTIONS
-- ============================================================
DROP POLICY IF EXISTS "Root users can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Only root can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins and members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "View transactions based on role" ON public.transactions;
DROP POLICY IF EXISTS "Admins and root can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins and root can update transactions" ON public.transactions;

CREATE POLICY "Only root can delete transactions" ON public.transactions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_root = true));

CREATE POLICY "Admins and root can insert transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins and root can update transactions" ON public.transactions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins and members can view transactions" ON public.transactions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true))
    OR member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid()))
  );

-- ============================================================
-- MEMBER_DUES
-- ============================================================
DROP POLICY IF EXISTS "Root users can delete member dues" ON public.member_dues;
DROP POLICY IF EXISTS "Only root can delete dues" ON public.member_dues;
DROP POLICY IF EXISTS "Admins and root can insert dues" ON public.member_dues;
DROP POLICY IF EXISTS "Admins and members can view dues" ON public.member_dues;
DROP POLICY IF EXISTS "Admins and root can update dues" ON public.member_dues;

CREATE POLICY "Only root can delete dues" ON public.member_dues FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_root = true));

CREATE POLICY "Admins and root can insert dues" ON public.member_dues FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins and root can update dues" ON public.member_dues FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins and members can view dues" ON public.member_dues FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true))
    OR member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid()))
  );

-- ============================================================
-- DONATIONS
-- ============================================================
DROP POLICY IF EXISTS "Root users can delete donations" ON public.donations;
DROP POLICY IF EXISTS "Only root can delete donations" ON public.donations;
DROP POLICY IF EXISTS "Allow admins to delete donations" ON public.donations;
DROP POLICY IF EXISTS "Admins and root can insert donations" ON public.donations;
DROP POLICY IF EXISTS "Allow all to insert donations" ON public.donations;
DROP POLICY IF EXISTS "Admins and members can view donations" ON public.donations;
DROP POLICY IF EXISTS "Allow authenticated to view donations" ON public.donations;
DROP POLICY IF EXISTS "Admins and root can update donations" ON public.donations;

CREATE POLICY "Only root can delete donations" ON public.donations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_root = true));

CREATE POLICY "Admins and root can insert donations" ON public.donations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins and root can update donations" ON public.donations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins and members can view donations" ON public.donations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true))
    OR (member_id IS NOT NULL AND member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())))
  );

-- ============================================================
-- ACTIVITY_LOGS
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Members can view own activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_admin = true));

CREATE POLICY "Members can view own activity logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (actor_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())));

-- ============================================================
-- SMS_CONFIG
-- ============================================================
DROP POLICY IF EXISTS "Admins and root can view SMS config" ON public.sms_config;
DROP POLICY IF EXISTS "Admins and root can update SMS config" ON public.sms_config;
DROP POLICY IF EXISTS "Admins and root can insert SMS config" ON public.sms_config;

CREATE POLICY "Admins and root can view SMS config" ON public.sms_config FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins and root can insert SMS config" ON public.sms_config FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins and root can update SMS config" ON public.sms_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- SMS_LOGS
-- ============================================================
DROP POLICY IF EXISTS "Admins and root can view SMS logs" ON public.sms_logs;

CREATE POLICY "Admins and root can view SMS logs" ON public.sms_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- SMS_VERIFICATION_CODES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own SMS codes" ON public.sms_verification_codes;
DROP POLICY IF EXISTS "Users can create own SMS codes" ON public.sms_verification_codes;
DROP POLICY IF EXISTS "Admins can view all SMS codes" ON public.sms_verification_codes;

CREATE POLICY "Admins can view all SMS codes" ON public.sms_verification_codes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Users can view own SMS codes" ON public.sms_verification_codes FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())));

CREATE POLICY "Users can create own SMS codes" ON public.sms_verification_codes FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())));

-- ============================================================
-- DUES
-- ============================================================
DROP POLICY IF EXISTS "Root users can delete dues" ON public.dues;
DROP POLICY IF EXISTS "Admins can delete dues" ON public.dues;

CREATE POLICY "Root users can delete dues" ON public.dues FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_root = true));

-- ============================================================
-- SOCIAL_MEDIA_CONFIG
-- ============================================================
DROP POLICY IF EXISTS "Root and admin can manage social media config" ON public.social_media_config;
DROP POLICY IF EXISTS "Admins can view social media config" ON public.social_media_config;
DROP POLICY IF EXISTS "Admins can insert social media config" ON public.social_media_config;
DROP POLICY IF EXISTS "Admins can update social media config" ON public.social_media_config;
DROP POLICY IF EXISTS "Admins can delete social media config" ON public.social_media_config;

CREATE POLICY "Admins can view social media config" ON public.social_media_config FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can insert social media config" ON public.social_media_config FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update social media config" ON public.social_media_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can delete social media config" ON public.social_media_config FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- SOCIAL_MEDIA_POSTS
-- ============================================================
DROP POLICY IF EXISTS "Root and admin can manage social media posts" ON public.social_media_posts;

CREATE POLICY "Root and admin can manage social media posts" ON public.social_media_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- EVENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can create events" ON public.events;

CREATE POLICY "Admins can create events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- EVENT_SOCIAL_POSTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can view event social posts" ON public.event_social_posts;

CREATE POLICY "Admins can view event social posts" ON public.event_social_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_admin = true));

-- ============================================================
-- EVENT_PARTICIPANTS
-- ============================================================
DROP POLICY IF EXISTS "Admins and root can insert event participants" ON public.event_participants;
DROP POLICY IF EXISTS "Admins and root can update event participants" ON public.event_participants;
DROP POLICY IF EXISTS "Admins and root can delete event participants" ON public.event_participants;
DROP POLICY IF EXISTS "Admins can update participant checkin" ON public.event_participants;

CREATE POLICY "Admins and root can insert event participants" ON public.event_participants FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins and root can update event participants" ON public.event_participants FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true))
    OR member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true))
    OR member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid()))
  );

CREATE POLICY "Admins and root can delete event participants" ON public.event_participants FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true))
    OR member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid()))
  );

-- ============================================================
-- IDENTITY_VERIFICATION_REQUESTS
-- ============================================================
DROP POLICY IF EXISTS "Users can view own identity verification" ON public.identity_verification_requests;
DROP POLICY IF EXISTS "Users can create own identity verification" ON public.identity_verification_requests;
DROP POLICY IF EXISTS "Admins can view all identity verifications" ON public.identity_verification_requests;
DROP POLICY IF EXISTS "Admins can update identity verifications" ON public.identity_verification_requests;

CREATE POLICY "Admins can view all identity verifications" ON public.identity_verification_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Users can view own identity verification" ON public.identity_verification_requests FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())));

CREATE POLICY "Users can create own identity verification" ON public.identity_verification_requests FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())));

CREATE POLICY "Admins can update identity verifications" ON public.identity_verification_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- EMAIL_UPDATE_REQUESTS
-- ============================================================
DROP POLICY IF EXISTS "Users can view own email update requests" ON public.email_update_requests;
DROP POLICY IF EXISTS "Users can create own email update requests" ON public.email_update_requests;
DROP POLICY IF EXISTS "Users can update own email update requests" ON public.email_update_requests;
DROP POLICY IF EXISTS "Admins can view all email update requests" ON public.email_update_requests;
DROP POLICY IF EXISTS "Admins can update all email update requests" ON public.email_update_requests;

CREATE POLICY "Admins can view all email update requests" ON public.email_update_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Users can view own email update requests" ON public.email_update_requests FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())));

CREATE POLICY "Users can create own email update requests" ON public.email_update_requests FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())));

CREATE POLICY "Admins can update all email update requests" ON public.email_update_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Users can update own email update requests" ON public.email_update_requests FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())))
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid())));

-- ============================================================
-- SURVEYS
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can delete surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can view all surveys" ON public.surveys;

CREATE POLICY "Admins can view all surveys" ON public.surveys FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can insert surveys" ON public.surveys FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update surveys" ON public.surveys FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can delete surveys" ON public.surveys FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- SURVEY_QUESTIONS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Admins can manage survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Admins can update survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Admins can delete survey questions" ON public.survey_questions;

CREATE POLICY "Authenticated users can view survey questions" ON public.survey_questions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = survey_questions.survey_id
    AND (
      EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true))
      OR (surveys.is_active = true AND (surveys.starts_at IS NULL OR surveys.starts_at <= now()) AND (surveys.ends_at IS NULL OR surveys.ends_at >= now()))
    )
  ));

CREATE POLICY "Admins can manage survey questions" ON public.survey_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update survey questions" ON public.survey_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can delete survey questions" ON public.survey_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- SURVEY_ANSWERS
-- ============================================================
DROP POLICY IF EXISTS "Members can view own answers, admins view all" ON public.survey_answers;

CREATE POLICY "Members can view own answers, admins view all" ON public.survey_answers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.survey_responses sr
    WHERE sr.id = survey_answers.response_id
    AND (
      sr.member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid()))
      OR EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true))
    )
  ));

-- ============================================================
-- SURVEY_RESPONSES
-- ============================================================
DROP POLICY IF EXISTS "Members and guests can view own responses, admins view all" ON public.survey_responses;

CREATE POLICY "Members and guests can view own responses, admins view all" ON public.survey_responses FOR SELECT TO public
  USING (
    member_id IS NULL
    OR member_id IN (SELECT id FROM public.members WHERE auth_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true))
  );

-- ============================================================
-- INVENTORY_CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Root can delete categories" ON public.inventory_categories;

CREATE POLICY "Admins can insert categories" ON public.inventory_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update categories" ON public.inventory_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Root can delete categories" ON public.inventory_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_root = true));

-- ============================================================
-- INVENTORY_ITEMS
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert items" ON public.inventory_items;
DROP POLICY IF EXISTS "Admins can update items" ON public.inventory_items;
DROP POLICY IF EXISTS "Root can delete items" ON public.inventory_items;

CREATE POLICY "Admins can insert items" ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update items" ON public.inventory_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Root can delete items" ON public.inventory_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_root = true));

-- ============================================================
-- INVENTORY_ASSIGNMENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.inventory_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON public.inventory_assignments;
DROP POLICY IF EXISTS "Root can delete assignments" ON public.inventory_assignments;

CREATE POLICY "Admins can insert assignments" ON public.inventory_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update assignments" ON public.inventory_assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Root can delete assignments" ON public.inventory_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_root = true));

-- ============================================================
-- INVENTORY_MAINTENANCE
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert maintenance" ON public.inventory_maintenance;
DROP POLICY IF EXISTS "Admins can update maintenance" ON public.inventory_maintenance;
DROP POLICY IF EXISTS "Root can delete maintenance" ON public.inventory_maintenance;

CREATE POLICY "Admins can insert maintenance" ON public.inventory_maintenance FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update maintenance" ON public.inventory_maintenance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Root can delete maintenance" ON public.inventory_maintenance FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_root = true));

-- ============================================================
-- INVENTORY_EVENT_USAGE
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert event usage" ON public.inventory_event_usage;
DROP POLICY IF EXISTS "Admins can update event usage" ON public.inventory_event_usage;
DROP POLICY IF EXISTS "Root can delete event usage" ON public.inventory_event_usage;

CREATE POLICY "Admins can insert event usage" ON public.inventory_event_usage FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update event usage" ON public.inventory_event_usage FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Root can delete event usage" ON public.inventory_event_usage FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND members.is_root = true));

-- ============================================================
-- SOCIAL_MONITOR_KEYWORDS
-- ============================================================
DROP POLICY IF EXISTS "Admins can view keywords" ON public.social_monitor_keywords;
DROP POLICY IF EXISTS "Admins can insert keywords" ON public.social_monitor_keywords;
DROP POLICY IF EXISTS "Admins can update keywords" ON public.social_monitor_keywords;
DROP POLICY IF EXISTS "Admins can delete keywords" ON public.social_monitor_keywords;

CREATE POLICY "Admins can view keywords" ON public.social_monitor_keywords FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can insert keywords" ON public.social_monitor_keywords FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update keywords" ON public.social_monitor_keywords FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can delete keywords" ON public.social_monitor_keywords FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- SOCIAL_MONITOR_ACCOUNTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can view accounts" ON public.social_monitor_accounts;
DROP POLICY IF EXISTS "Admins can insert accounts" ON public.social_monitor_accounts;
DROP POLICY IF EXISTS "Admins can update accounts" ON public.social_monitor_accounts;
DROP POLICY IF EXISTS "Admins can delete accounts" ON public.social_monitor_accounts;

CREATE POLICY "Admins can view accounts" ON public.social_monitor_accounts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can insert accounts" ON public.social_monitor_accounts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update accounts" ON public.social_monitor_accounts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can delete accounts" ON public.social_monitor_accounts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- SOCIAL_MONITOR_RESULTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can view results" ON public.social_monitor_results;
DROP POLICY IF EXISTS "Admins can insert results" ON public.social_monitor_results;
DROP POLICY IF EXISTS "Admins can delete results" ON public.social_monitor_results;

CREATE POLICY "Admins can view results" ON public.social_monitor_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can insert results" ON public.social_monitor_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can delete results" ON public.social_monitor_results FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- SOCIAL_MONITOR_REPORTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can view reports" ON public.social_monitor_reports;
DROP POLICY IF EXISTS "Admins can insert reports" ON public.social_monitor_reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON public.social_monitor_reports;

CREATE POLICY "Admins can view reports" ON public.social_monitor_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can insert reports" ON public.social_monitor_reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can delete reports" ON public.social_monitor_reports FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- QUERY_RESPONSE_TEMPLATES
-- ============================================================
DROP POLICY IF EXISTS "Admins can select query_response_templates" ON public.query_response_templates;
DROP POLICY IF EXISTS "Admins can insert query_response_templates" ON public.query_response_templates;
DROP POLICY IF EXISTS "Admins can update query_response_templates" ON public.query_response_templates;
DROP POLICY IF EXISTS "Admins can delete query_response_templates" ON public.query_response_templates;

CREATE POLICY "Admins can select query_response_templates" ON public.query_response_templates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can insert query_response_templates" ON public.query_response_templates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update query_response_templates" ON public.query_response_templates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can delete query_response_templates" ON public.query_response_templates FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- API_CLIENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can select api_clients" ON public.api_clients;
DROP POLICY IF EXISTS "Admins can insert api_clients" ON public.api_clients;
DROP POLICY IF EXISTS "Admins can update api_clients" ON public.api_clients;
DROP POLICY IF EXISTS "Admins can delete api_clients" ON public.api_clients;

CREATE POLICY "Admins can select api_clients" ON public.api_clients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can insert api_clients" ON public.api_clients FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can update api_clients" ON public.api_clients FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

CREATE POLICY "Admins can delete api_clients" ON public.api_clients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));

-- ============================================================
-- QUERY_LOGS
-- ============================================================
DROP POLICY IF EXISTS "Admins can select query_logs" ON public.query_logs;

CREATE POLICY "Admins can select query_logs" ON public.query_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members WHERE members.auth_id = (SELECT auth.uid()) AND (members.is_admin = true OR members.is_root = true)));
