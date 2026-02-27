/*
  # Etkinlikler Tablosu Oluştur

  1. Yeni Tablolar
    - `events` (etkinlikler)
      - `id` (uuid, primary key) - Benzersiz etkinlik kimliği
      - `title` (text) - Etkinlik başlığı
      - `location` (text) - Etkinlik konumu
      - `date` (date) - Etkinlik tarihi
      - `time` (time) - Etkinlik saati
      - `description` (text) - Etkinlik açıklaması (HTML içerebilir)
      - `created_at` (timestamptz) - Kayıt oluşturulma zamanı
      - `updated_at` (timestamptz) - Son güncellenme zamanı
      - `created_by` (uuid, foreign key) - Etkinliği oluşturan kullanıcı

  2. Güvenlik
    - `events` tablosu için RLS etkinleştirildi
    - Herkes etkinlikleri görüntüleyebilir (SELECT)
    - Sadece giriş yapmış kullanıcılar etkinlik oluşturabilir (INSERT)
    - Sadece giriş yapmış kullanıcılar etkinlikleri güncelleyebilir (UPDATE)
    - Sadece giriş yapmış kullanıcılar etkinlikleri silebilir (DELETE)

  3. Önemli Notlar
    - Tüm tarih ve saat bilgileri uygun formatlarda saklanır
    - Açıklama alanı zengin metin içeriği için text formatında
    - Otomatik zaman damgaları ile kayıt takibi
*/

-- Etkinlikler tablosu oluştur
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  location text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS etkinleştir
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- SELECT: Herkes etkinlikleri görüntüleyebilir
CREATE POLICY "Anyone can view events"
  ON events
  FOR SELECT
  TO public
  USING (true);

-- INSERT: Sadece giriş yapmış kullanıcılar etkinlik ekleyebilir
CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: Sadece giriş yapmış kullanıcılar etkinlikleri güncelleyebilir
CREATE POLICY "Authenticated users can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Sadece giriş yapmış kullanıcılar etkinlikleri silebilir
CREATE POLICY "Authenticated users can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (true);

-- Updated_at için trigger oluştur
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_events_updated_at'
  ) THEN
    CREATE TRIGGER update_events_updated_at
      BEFORE UPDATE ON events
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
