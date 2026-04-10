/*
  # Push Notification Altyapisi

  ## Ozet
  Mobil cihazlara push bildirim gondermek icin gerekli tablolar ve guvenllik politikalari.

  ## Yeni Tablolar

  ### 1. device_tokens
  Her kullanicinin kayitli mobil cihaz tokenlarini saklar.
  - id: Benzersiz kayit kimlik
  - member_id: Uye baglantisi
  - token: Expo push token degeri
  - platform: 'ios' | 'android'
  - is_active: Token gecerliligi
  - last_seen_at: Son gorulme zamani
  - created_at: Olusturma zamani

  ### 2. push_notifications
  Yonetici tarafindan gonderilen push bildirim kayitlari.
  - id: Benzersiz kayit kimlik
  - title: Bildirim basligi
  - body: Bildirim icerik metni
  - data: Ek JSON verisi (opsiyonel)
  - recipient_type: 'all' | 'specific'
  - status: 'pending' | 'sent' | 'failed'
  - sent_by: Gonderi yapan yonetici uye id
  - sent_at: Gonderim zamani
  - total_sent: Basarili gonderi sayisi
  - total_failed: Basarisiz gonderi sayisi
  - created_at: Olusturma zamani

  ### 3. push_notification_recipients
  Her bildirimin hangi uyelere gonderildigini ve durumunu takip eder.
  - id: Benzersiz kayit kimlik
  - notification_id: Bildirim baglantisi
  - member_id: Alici uye baglantisi
  - token: Kullanilan push token
  - status: 'pending' | 'sent' | 'failed'
  - error_message: Hata durumunda aciklama
  - sent_at: Gonderim zamani
  - created_at: Olusturma zamani

  ## Guvenlik
  - RLS tum tablolarda aktif
  - Yonetici device_tokens okuyabilir
  - Uyeler sadece kendi tokenlarini yonetebilir
  - Yonetici push_notifications olusturabilir ve gorebilir
  - Uyeler sadece kendi bildirim durumlarini gorebilir
*/

-- device_tokens tablosu
CREATE TABLE IF NOT EXISTS device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active boolean DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (member_id, token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can insert own tokens"
  ON device_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Members can update own tokens"
  ON device_tokens FOR UPDATE
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

CREATE POLICY "Members can delete own tokens"
  ON device_tokens FOR DELETE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Members can view own tokens"
  ON device_tokens FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all tokens"
  ON device_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- push_notifications tablosu
CREATE TABLE IF NOT EXISTS push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  recipient_type text NOT NULL CHECK (recipient_type IN ('all', 'specific')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  sent_by uuid REFERENCES members(id),
  sent_at timestamptz,
  total_sent integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view push notifications"
  ON push_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can create push notifications"
  ON push_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update push notifications"
  ON push_notifications FOR UPDATE
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

-- push_notification_recipients tablosu
CREATE TABLE IF NOT EXISTS push_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all push recipients"
  ON push_notification_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can insert push recipients"
  ON push_notification_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update push recipients"
  ON push_notification_recipients FOR UPDATE
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

CREATE POLICY "Members can view own push status"
  ON push_notification_recipients FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

-- Performans indexleri
CREATE INDEX IF NOT EXISTS idx_device_tokens_member_id ON device_tokens(member_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_is_active ON device_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status);
CREATE INDEX IF NOT EXISTS idx_push_notifications_created_at ON push_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notification_recipients_notification_id ON push_notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_recipients_member_id ON push_notification_recipients(member_id);
