/*
  # Module Configuration System

  This migration creates a centralized module configuration table that controls
  which features/modules are enabled or visible on both web and mobile platforms.
  
  Changes made from web admin panel are automatically reflected on mobile through
  Supabase Realtime subscriptions.

  ## New Tables

  ### module_config
  - `id` (uuid, primary key)
  - `module_key` (text, unique) - identifier like 'members', 'treasury', 'dues_admin'
  - `label` (text) - display name
  - `enabled_web` (boolean) - visible/enabled on web
  - `enabled_mobile` (boolean) - visible/enabled on mobile
  - `admin_only` (boolean) - only visible to admins/root
  - `root_only` (boolean) - only visible to root users
  - `sort_order` (int) - display order
  - `icon` (text) - icon name for mobile
  - `updated_at` (timestamptz)

  ## Security
  - Public read access (module config is non-sensitive)
  - Only admins can update via RLS policy
  - Realtime enabled for the table
*/

CREATE TABLE IF NOT EXISTS module_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text UNIQUE NOT NULL,
  label text NOT NULL,
  enabled_web boolean NOT NULL DEFAULT true,
  enabled_mobile boolean NOT NULL DEFAULT true,
  admin_only boolean NOT NULL DEFAULT false,
  root_only boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  icon text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE module_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read module config"
  ON module_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can update module config"
  ON module_config FOR UPDATE
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

CREATE POLICY "Root can insert module config"
  ON module_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

INSERT INTO module_config (module_key, label, enabled_web, enabled_mobile, admin_only, root_only, sort_order, icon) VALUES
  ('home',           'Ana Sayfa',         true,  true,  false, false, 1,  'home-outline'),
  ('announcements',  'Duyurular',         true,  true,  false, false, 2,  'megaphone-outline'),
  ('events',         'Etkinlikler',       true,  true,  false, false, 3,  'calendar-outline'),
  ('dues',           'Aidatlarım',        true,  true,  false, false, 4,  'wallet-outline'),
  ('gallery',        'Galeri',            true,  true,  false, false, 5,  'images-outline'),
  ('members',        'Üyeler',            true,  true,  false, false, 6,  'people-outline'),
  ('pharmacy',       'Nöbetçi Eczane',    true,  true,  false, false, 7,  'medkit-outline'),
  ('contact',        'İletişim',          true,  true,  false, false, 8,  'call-outline'),
  ('whatsapp',       'WhatsApp',          true,  true,  false, false, 9,  'logo-whatsapp'),
  ('notifications',  'Bildirimler',       true,  true,  false, false, 10, 'notifications-outline'),
  ('treasury',       'Kasa Yönetimi',     true,  true,  true,  false, 11, 'cash-outline'),
  ('dues_admin',     'Aidat Yönetimi',    true,  true,  true,  false, 12, 'receipt-outline'),
  ('board',          'Yönetim Kurulu',    true,  true,  false, false, 13, 'shield-outline'),
  ('donations',      'Bağışlar',          true,  true,  false, false, 14, 'heart-outline'),
  ('surveys',        'Anketler',          true,  true,  false, false, 15, 'clipboard-outline'),
  ('inventory',      'Envanter',          true,  true,  true,  false, 16, 'cube-outline')
ON CONFLICT (module_key) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE module_config;
