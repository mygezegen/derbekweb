/*
  # SMTP Settings and Board Members System

  1. New Tables
    - `smtp_settings`
      - `id` (uuid, primary key)
      - `smtp_host` (text) - SMTP sunucu adresi
      - `smtp_port` (integer) - SMTP port numarası
      - `smtp_username` (text) - SMTP kullanıcı adı
      - `smtp_password` (text) - SMTP şifre
      - `from_email` (text) - Gönderici e-posta adresi
      - `from_name` (text) - Gönderici adı
      - `is_active` (boolean) - Aktif yapılandırma
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `board_members`
      - `id` (uuid, primary key)
      - `full_name` (text) - Yönetici adı soyadı
      - `position` (text) - Görevi (Başkan, Başkan Yardımcısı, vb.)
      - `email` (text) - E-posta adresi
      - `phone` (text) - Telefon
      - `photo_url` (text) - Fotoğraf URL'si
      - `display_order` (integer) - Sıralama
      - `is_active` (boolean) - Aktif mi
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Admin users can manage all records
    - Public users can only read board members (not SMTP settings)
    - SMTP settings are admin-only for security
*/

-- SMTP Settings Table
CREATE TABLE IF NOT EXISTS smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_username text NOT NULL DEFAULT '',
  smtp_password text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT 'info@caybasi.org',
  from_name text NOT NULL DEFAULT 'Çaybaşı Köyü Derneği',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Board Members Table
CREATE TABLE IF NOT EXISTS board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  position text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  photo_url text DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- SMTP Settings Policies (Admin Only)
CREATE POLICY "Admins can view SMTP settings"
  ON smtp_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can insert SMTP settings"
  ON smtp_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update SMTP settings"
  ON smtp_settings FOR UPDATE
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

CREATE POLICY "Admins can delete SMTP settings"
  ON smtp_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Board Members Policies
CREATE POLICY "Everyone can view active board members"
  ON board_members FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all board members"
  ON board_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can insert board members"
  ON board_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update board members"
  ON board_members FOR UPDATE
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

CREATE POLICY "Admins can delete board members"
  ON board_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_smtp_settings_active ON smtp_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_board_members_active ON board_members(is_active, display_order);

-- Insert default SMTP configuration
INSERT INTO smtp_settings (smtp_host, smtp_port, smtp_username, from_email, from_name, is_active)
VALUES ('', 587, '', 'info@caybasi.org', 'Çaybaşı Köyü Derneği', true)
ON CONFLICT DO NOTHING;
