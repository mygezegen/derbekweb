/*
  # Sayfa Ayarları ve İletişim Yönetimi İyileştirmeleri

  1. Yeni Tablolar
    - `page_settings`
      - `id` (uuid, primary key)
      - `page_key` (text, unique) - Sayfa tanımlayıcısı (home, members, announcements, events, dues, gallery, contact)
      - `page_name` (text) - Sayfa adı
      - `visible_to_admin` (boolean) - Admin için görünür mü
      - `visible_to_members` (boolean) - Üyeler için görünür mü
      - `is_enabled` (boolean) - Sayfa aktif mi
      - `display_order` (integer) - Görüntüleme sırası
      - `description` (text) - Sayfa açıklaması
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Mevcut Tabloları Güncelleme
    - contact_info tablosu zaten var, hiç değişiklik yapmaya gerek yok
    - management_info tablosu zaten var, hiç değişiklik yapmaya gerek yok

  3. Güvenlik
    - page_settings için RLS politikaları
    - Herkes okuyabilir
    - Sadece adminler güncelleyebilir
*/

-- page_settings tablosu oluştur
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

-- RLS'yi etkinleştir
ALTER TABLE page_settings ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "Anyone can read page settings"
  ON page_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Sadece adminler güncelleyebilir
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

-- Sadece adminler yeni ayar ekleyebilir
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

-- Varsayılan sayfa ayarlarını ekle
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

-- updated_at için trigger oluştur
CREATE OR REPLACE FUNCTION update_page_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_page_settings_updated_at'
  ) THEN
    CREATE TRIGGER set_page_settings_updated_at
      BEFORE UPDATE ON page_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_page_settings_updated_at();
  END IF;
END $$;

-- management_info tablosuna RLS politikaları ekle (eğer yoksa)
DO $$
BEGIN
  -- Herkes okuyabilir politikası
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'management_info' 
    AND policyname = 'Anyone can read management info'
  ) THEN
    CREATE POLICY "Anyone can read management info"
      ON management_info
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Adminler oluşturabilir politikası
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'management_info' 
    AND policyname = 'Admins can insert management info'
  ) THEN
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
  END IF;

  -- Adminler güncelleyebilir politikası
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'management_info' 
    AND policyname = 'Admins can update management info'
  ) THEN
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
  END IF;

  -- Adminler silebilir politikası
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'management_info' 
    AND policyname = 'Admins can delete management info'
  ) THEN
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
  END IF;
END $$;