/*
  # Çaybaşı Köyü Derneği - Tam Veritabanı Kurulumu

  Bu SQL dosyası tüm tabloları, trigger'ları, function'ları ve güvenlik politikalarını içerir.
  Supabase Dashboard -> SQL Editor'de çalıştırın.
*/

-- =====================================================
-- 1. MEMBERS TABLE (Üyeler)
-- =====================================================

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ek Bilgiler
  registry_number text,
  tc_identity_no text,
  representative_name text,
  representative_tc_no text,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  is_legal_entity boolean DEFAULT false,
  legal_entity_number text,
  website text,
  profession text,
  education_level text,
  title text,
  province text,
  district text,
  member_type text DEFAULT 'regular',
  board_decision_date date,
  status_change_date date,
  registration_date date DEFAULT CURRENT_DATE,
  passive_status_date date,
  passive_status_reason text,
  passive_objection_date date,
  is_active boolean DEFAULT true
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. ANNOUNCEMENTS TABLE (Duyurular)
-- =====================================================

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. EVENTS TABLE (Etkinlikler)
-- =====================================================

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. ADMIN_SETTINGS TABLE (Yönetim Ayarları)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. DUES TABLE (Aidat Tanımları)
-- =====================================================

CREATE TABLE IF NOT EXISTS dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  period_month integer NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year integer NOT NULL,
  due_date date NOT NULL,
  description text,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dues ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. MEMBER_DUES TABLE (Üye Aidat Kayıtları)
-- =====================================================

CREATE TABLE IF NOT EXISTS member_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  dues_id uuid NOT NULL REFERENCES dues(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_amount numeric(10, 2) DEFAULT 0,
  paid_at timestamptz,
  payment_method text CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'other')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, dues_id)
);

ALTER TABLE member_dues ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. GALLERIES TABLE (Galeri Kategorileri)
-- =====================================================

CREATE TABLE IF NOT EXISTS galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  cover_image_url text,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. GALLERY_IMAGES TABLE (Galeri Fotoğrafları)
-- =====================================================

CREATE TABLE IF NOT EXISTS gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  display_order integer DEFAULT 0,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. EVENT_PARTICIPANTS TABLE (Etkinlik Katılımcıları)
-- =====================================================

CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'not_attending', 'maybe')),
  registered_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, member_id)
);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. NOTIFICATIONS TABLE (Bildirimler)
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'sms')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('all', 'debtors', 'specific')),
  sent_by uuid REFERENCES members(id) ON DELETE SET NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. NOTIFICATION_RECIPIENTS TABLE (Bildirim Alıcıları)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 12. DONATIONS TABLE (Bağışlar)
-- =====================================================

CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  donation_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  payment_method text CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'other')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES members(id) ON DELETE SET NULL
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 13. AUDIT_LOGS TABLE (Denetim Kayıtları)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 14. CONTACT_INFO TABLE (İletişim Bilgileri)
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text,
  email text,
  address text,
  social_media jsonb DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contact_info ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 15. MANAGEMENT_INFO TABLE (Yönetim Kurulu Bilgileri)
-- =====================================================

CREATE TABLE IF NOT EXISTS management_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  position text NOT NULL,
  bio text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE management_info ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 16. PAGE_SETTINGS TABLE (Sayfa Ayarları)
-- =====================================================

CREATE TABLE IF NOT EXISTS page_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  page_name text NOT NULL,
  visible_to_admin boolean DEFAULT true NOT NULL,
  visible_to_members boolean DEFAULT true NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE page_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INDEXES (Performans İndeksleri)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_member_dues_member_id ON member_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_status ON member_dues(status);
CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_id ON gallery_images(gallery_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_dues_period ON dues(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_dues_created_by ON dues(created_by);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_galleries_created_by ON galleries(created_by);
CREATE INDEX IF NOT EXISTS idx_gallery_images_created_by ON gallery_images(created_by);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_member_id_fkey ON notification_recipients(member_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification_id_fkey ON notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_by ON notifications(sent_by);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_created_by_fkey ON donations(created_by);
CREATE INDEX IF NOT EXISTS idx_donations_member_id_fkey ON donations(member_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_member_id_fkey ON event_participants(member_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_dues_id_fkey ON member_dues(dues_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_member_created ON audit_logs(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_contact_info_updated_by_fkey ON contact_info(updated_by);
CREATE INDEX IF NOT EXISTS idx_management_info_active_order ON management_info(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_management_info_member_id_fkey ON management_info(member_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active_expires ON announcements(is_active, expires_at);

-- =====================================================
-- FUNCTIONS (Fonksiyonlar)
-- =====================================================

-- İlk üyeyi admin yap
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

-- Yeni aidat oluşturulduğunda tüm üyelere ekle
CREATE OR REPLACE FUNCTION public.create_member_dues_for_all()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO member_dues (member_id, dues_id, status)
  SELECT id, NEW.id, 'pending'
  FROM members
  WHERE is_active = true
  ON CONFLICT (member_id, dues_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Updated_at otomatik güncelle
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

-- Audit log fonksiyonu
CREATE OR REPLACE FUNCTION log_action(
  p_member_id uuid,
  p_action_type text,
  p_table_name text,
  p_record_id uuid,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (
    member_id,
    action_type,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    p_member_id,
    p_action_type,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Page settings updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_page_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS (Tetikleyiciler)
-- =====================================================

DROP TRIGGER IF EXISTS trigger_make_first_member_admin ON members;
CREATE TRIGGER trigger_make_first_member_admin
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION make_first_member_admin();

DROP TRIGGER IF EXISTS trigger_create_member_dues_for_all ON dues;
CREATE TRIGGER trigger_create_member_dues_for_all
  AFTER INSERT ON dues
  FOR EACH ROW
  EXECUTE FUNCTION create_member_dues_for_all();

DROP TRIGGER IF EXISTS trigger_update_dues_updated_at ON dues;
CREATE TRIGGER trigger_update_dues_updated_at
  BEFORE UPDATE ON dues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_member_dues_updated_at ON member_dues;
CREATE TRIGGER trigger_update_member_dues_updated_at
  BEFORE UPDATE ON member_dues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_galleries_updated_at ON galleries;
CREATE TRIGGER trigger_update_galleries_updated_at
  BEFORE UPDATE ON galleries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_event_participants_updated_at ON event_participants;
CREATE TRIGGER trigger_update_event_participants_updated_at
  BEFORE UPDATE ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_page_settings_updated_at ON page_settings;
CREATE TRIGGER set_page_settings_updated_at
  BEFORE UPDATE ON page_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_page_settings_updated_at();

-- =====================================================
-- RLS POLICIES - MEMBERS
-- =====================================================

CREATE POLICY "Members can view all members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  TO authenticated
  USING (auth_id = (select auth.uid()))
  WITH CHECK (auth_id = (select auth.uid()));

CREATE POLICY "Users can create own member profile"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_id = auth.uid() AND
    email IS NOT NULL AND
    full_name IS NOT NULL
  );

CREATE POLICY "Admins can create member profiles"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can update all members"
  ON members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.is_admin = true
    )
  );

-- =====================================================
-- RLS POLICIES - ANNOUNCEMENTS
-- =====================================================

CREATE POLICY "Members can view all announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

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
-- RLS POLICIES - EVENTS
-- =====================================================

CREATE POLICY "Members can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

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
-- RLS POLICIES - ADMIN_SETTINGS
-- =====================================================

CREATE POLICY "Everyone can view admin settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (true);

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
-- RLS POLICIES - DUES
-- =====================================================

CREATE POLICY "Anyone can view dues"
  ON dues FOR SELECT
  TO authenticated
  USING (true);

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
-- RLS POLICIES - MEMBER_DUES
-- =====================================================

CREATE POLICY "Members can view own dues"
  ON member_dues FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = (select auth.uid())
    )
  );

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

-- =====================================================
-- RLS POLICIES - GALLERIES
-- =====================================================

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

-- =====================================================
-- RLS POLICIES - GALLERY_IMAGES
-- =====================================================

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

-- =====================================================
-- RLS POLICIES - EVENT_PARTICIPANTS
-- =====================================================

CREATE POLICY "Members can view event participants"
  ON event_participants FOR SELECT
  TO authenticated
  USING (true);

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
-- RLS POLICIES - NOTIFICATIONS
-- =====================================================

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

-- =====================================================
-- RLS POLICIES - NOTIFICATION_RECIPIENTS
-- =====================================================

CREATE POLICY "View notification recipients"
  ON notification_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
    OR
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
-- RLS POLICIES - DONATIONS
-- =====================================================

CREATE POLICY "View donations"
  ON donations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = (select auth.uid())
      AND members.is_admin = true
    )
    OR
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
-- RLS POLICIES - AUDIT_LOGS
-- =====================================================

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- =====================================================
-- RLS POLICIES - CONTACT_INFO
-- =====================================================

CREATE POLICY "Anyone can view contact info"
  ON contact_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert contact info"
  ON contact_info FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update contact info"
  ON contact_info FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- =====================================================
-- RLS POLICIES - MANAGEMENT_INFO
-- =====================================================

CREATE POLICY "Anyone can read management info"
  ON management_info
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert management info"
  ON management_info
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update management info"
  ON management_info
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete management info"
  ON management_info
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- =====================================================
-- RLS POLICIES - PAGE_SETTINGS
-- =====================================================

CREATE POLICY "Anyone can read page settings"
  ON page_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update page settings"
  ON page_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can insert page settings"
  ON page_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- =====================================================
-- DEFAULT DATA (Varsayılan Veriler)
-- =====================================================

-- İletişim bilgilerini ekle
INSERT INTO contact_info (phone, email, address)
SELECT
  '+90 XXX XXX XX XX',
  'info@caybasi.org',
  'Çaybaşı Köyü, Çüngüş, Diyarbakır'
WHERE NOT EXISTS (SELECT 1 FROM contact_info LIMIT 1);

-- Sayfa ayarlarını ekle
INSERT INTO page_settings (page_key, page_name, visible_to_admin, visible_to_members, is_enabled, display_order, description)
VALUES
  ('home', 'Ana Sayfa', true, true, true, 1, 'Genel bilgiler ve istatistikler'),
  ('members', 'Üyeler', true, true, true, 2, 'Üye dizini ve bilgileri'),
  ('announcements', 'Duyurular', true, true, true, 3, 'Genel duyurular'),
  ('events', 'Etkinlikler', true, true, true, 4, 'Etkinlik takvimi'),
  ('dues', 'Aidatlar', true, true, true, 5, 'Aidat ödemeleri ve takibi'),
  ('gallery', 'Galeri', true, true, true, 6, 'Fotoğraf galerileri'),
  ('contact', 'İletişim', true, true, true, 7, 'İletişim bilgileri ve yönetim kurulu'),
  ('bulk', 'Toplu İşlemler', true, false, true, 8, 'Toplu üye ve işlem yönetimi'),
  ('admin', 'Yönetim', true, false, true, 9, 'Sistem yönetimi ve ayarları')
ON CONFLICT (page_key) DO NOTHING;
