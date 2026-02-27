-- =====================================================
-- RLS POLICIES - MEMBERS
-- =====================================================

DROP POLICY IF EXISTS "Members can view all members" ON members;
CREATE POLICY "Members can view all members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can update own profile" ON members;
CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own member profile" ON members;
CREATE POLICY "Users can create own member profile"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_id = auth.uid() AND
    email IS NOT NULL AND
    full_name IS NOT NULL
  );

DROP POLICY IF EXISTS "Admins can create member profiles" ON members;
CREATE POLICY "Admins can create member profiles"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND (m.is_admin = true OR m.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update all members" ON members;
CREATE POLICY "Admins can update all members"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND (m.is_admin = true OR m.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND (m.is_admin = true OR m.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete members" ON members;
CREATE POLICY "Root can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - EVENTS
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view events" ON events;
CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated admins can create events" ON events;
CREATE POLICY "Authenticated admins can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Authenticated admins can update events" ON events;
CREATE POLICY "Authenticated admins can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete events" ON events;
CREATE POLICY "Root can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - ANNOUNCEMENTS
-- =====================================================

DROP POLICY IF EXISTS "Public can view announcements" ON announcements;
CREATE POLICY "Public can view announcements"
  ON announcements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;
CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete announcements" ON announcements;
CREATE POLICY "Root can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - ADMIN_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Everyone can view admin settings" ON admin_settings;
CREATE POLICY "Everyone can view admin settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON admin_settings;
CREATE POLICY "Admins can update settings"
  ON admin_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- =====================================================
-- RLS POLICIES - DUES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view dues" ON dues;
CREATE POLICY "Anyone can view dues"
  ON dues FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert dues" ON dues;
CREATE POLICY "Admins can insert dues"
  ON dues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update dues" ON dues;
CREATE POLICY "Admins can update dues"
  ON dues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete dues" ON dues;
CREATE POLICY "Root can delete dues"
  ON dues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - MEMBER_DUES
-- =====================================================

DROP POLICY IF EXISTS "Members can view own dues" ON member_dues;
CREATE POLICY "Members can view own dues"
  ON member_dues FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can insert member dues" ON member_dues;
CREATE POLICY "Admins can insert member dues"
  ON member_dues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update member dues" ON member_dues;
CREATE POLICY "Admins can update member dues"
  ON member_dues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete member dues" ON member_dues;
CREATE POLICY "Root can delete member dues"
  ON member_dues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - GALLERIES
-- =====================================================

DROP POLICY IF EXISTS "Public galleries viewable by all" ON galleries;
CREATE POLICY "Public galleries viewable by all"
  ON galleries FOR SELECT
  USING (
    is_public = true OR
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can insert galleries" ON galleries;
CREATE POLICY "Admins can insert galleries"
  ON galleries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update galleries" ON galleries;
CREATE POLICY "Admins can update galleries"
  ON galleries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete galleries" ON galleries;
CREATE POLICY "Root can delete galleries"
  ON galleries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - GALLERY_IMAGES
-- =====================================================

DROP POLICY IF EXISTS "Gallery images viewable based on gallery visibility" ON gallery_images;
CREATE POLICY "Gallery images viewable based on gallery visibility"
  ON gallery_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM galleries
      WHERE galleries.id = gallery_images.gallery_id
      AND (
        galleries.is_public = true OR
        EXISTS (
          SELECT 1 FROM members
          WHERE members.auth_id = auth.uid()
          AND (members.is_admin = true OR members.is_root = true)
        )
      )
    )
  );

DROP POLICY IF EXISTS "Admins can insert gallery images" ON gallery_images;
CREATE POLICY "Admins can insert gallery images"
  ON gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update gallery images" ON gallery_images;
CREATE POLICY "Admins can update gallery images"
  ON gallery_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete gallery images" ON gallery_images;
CREATE POLICY "Root can delete gallery images"
  ON gallery_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - GALLERY_COMMENTS
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view gallery comments" ON gallery_comments;
CREATE POLICY "Anyone can view gallery comments"
  ON gallery_comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON gallery_comments;
CREATE POLICY "Authenticated users can insert comments"
  ON gallery_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own comments" ON gallery_comments;
CREATE POLICY "Users can update own comments"
  ON gallery_comments FOR UPDATE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own comments or root can delete any" ON gallery_comments;
CREATE POLICY "Users can delete own comments or root can delete any"
  ON gallery_comments FOR DELETE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - EVENT_PARTICIPANTS
-- =====================================================

DROP POLICY IF EXISTS "Members can view event participants" ON event_participants;
CREATE POLICY "Members can view event participants"
  ON event_participants FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can manage own participation" ON event_participants;
CREATE POLICY "Members can manage own participation"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update own participation" ON event_participants;
CREATE POLICY "Members can update own participation"
  ON event_participants FOR UPDATE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete own participation" ON event_participants;
CREATE POLICY "Members can delete own participation"
  ON event_participants FOR DELETE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - EVENT_IMAGES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view event images" ON event_images;
CREATE POLICY "Anyone can view event images"
  ON event_images FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert event images" ON event_images;
CREATE POLICY "Admins can insert event images"
  ON event_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update event images" ON event_images;
CREATE POLICY "Admins can update event images"
  ON event_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete event images" ON event_images;
CREATE POLICY "Root can delete event images"
  ON event_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - NOTIFICATIONS
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update notifications" ON notifications;
CREATE POLICY "Admins can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- =====================================================
-- RLS POLICIES - NOTIFICATION_RECIPIENTS
-- =====================================================

DROP POLICY IF EXISTS "View notification recipients" ON notification_recipients;
CREATE POLICY "View notification recipients"
  ON notification_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
    OR
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert notification recipients" ON notification_recipients;
CREATE POLICY "Admins can insert notification recipients"
  ON notification_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update notification recipients" ON notification_recipients;
CREATE POLICY "Admins can update notification recipients"
  ON notification_recipients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete notification recipients" ON notification_recipients;
CREATE POLICY "Root can delete notification recipients"
  ON notification_recipients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - DONATIONS
-- =====================================================

DROP POLICY IF EXISTS "View donations" ON donations;
CREATE POLICY "View donations"
  ON donations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
    OR
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert donations" ON donations;
CREATE POLICY "Admins can insert donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update donations" ON donations;
CREATE POLICY "Admins can update donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete donations" ON donations;
CREATE POLICY "Root can delete donations"
  ON donations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - TREASURY_TRANSACTIONS
-- =====================================================

DROP POLICY IF EXISTS "Admins can view treasury transactions" ON treasury_transactions;
CREATE POLICY "Admins can view treasury transactions"
  ON treasury_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can insert treasury transactions" ON treasury_transactions;
CREATE POLICY "Admins can insert treasury transactions"
  ON treasury_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update treasury transactions" ON treasury_transactions;
CREATE POLICY "Admins can update treasury transactions"
  ON treasury_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete treasury transactions" ON treasury_transactions;
CREATE POLICY "Root can delete treasury transactions"
  ON treasury_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - AUDIT_LOGS
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- =====================================================
-- RLS POLICIES - CONTACT_INFO
-- =====================================================

DROP POLICY IF EXISTS "Public can view contact info" ON contact_info;
CREATE POLICY "Public can view contact info"
  ON contact_info FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert contact info" ON contact_info;
CREATE POLICY "Admins can insert contact info"
  ON contact_info FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update contact info" ON contact_info;
CREATE POLICY "Admins can update contact info"
  ON contact_info FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- =====================================================
-- RLS POLICIES - MANAGEMENT_INFO
-- =====================================================

DROP POLICY IF EXISTS "Public can read management info" ON management_info;
CREATE POLICY "Public can read management info"
  ON management_info FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert management info" ON management_info;
CREATE POLICY "Admins can insert management info"
  ON management_info FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update management info" ON management_info;
CREATE POLICY "Admins can update management info"
  ON management_info FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Root can delete management info" ON management_info;
CREATE POLICY "Root can delete management info"
  ON management_info FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- =====================================================
-- RLS POLICIES - PAGE_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read page settings" ON page_settings;
CREATE POLICY "Anyone can read page settings"
  ON page_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update page settings" ON page_settings;
CREATE POLICY "Admins can update page settings"
  ON page_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can insert page settings" ON page_settings;
CREATE POLICY "Admins can insert page settings"
  ON page_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- =====================================================
-- RLS POLICIES - SMTP_CONFIGURATION
-- =====================================================

DROP POLICY IF EXISTS "Admins can view SMTP config" ON smtp_configuration;
CREATE POLICY "Admins can view SMTP config"
  ON smtp_configuration FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can insert SMTP config" ON smtp_configuration;
CREATE POLICY "Admins can insert SMTP config"
  ON smtp_configuration FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update SMTP config" ON smtp_configuration;
CREATE POLICY "Admins can update SMTP config"
  ON smtp_configuration FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- =====================================================
-- RLS POLICIES - SMS_CONFIGURATION
-- =====================================================

DROP POLICY IF EXISTS "Admins can view SMS config" ON sms_configuration;
CREATE POLICY "Admins can view SMS config"
  ON sms_configuration FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can insert SMS config" ON sms_configuration;
CREATE POLICY "Admins can insert SMS config"
  ON sms_configuration FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update SMS config" ON sms_configuration;
CREATE POLICY "Admins can update SMS config"
  ON sms_configuration FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );