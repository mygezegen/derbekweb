/*
  # QR Giriş Sistemi - Etkinlik ve Katılımcı Tabloları

  ## Özet
  Etkinliklere QR kod tabanlı giriş sistemi eklenmektedir.

  ## Değişiklikler

  ### 1. events tablosu
  - `qr_checkin_enabled` (boolean, varsayılan false): Etkinlik için QR giriş sistemini aktifleştirir

  ### 2. event_participants tablosu
  - `checked_in` (boolean, varsayılan false): Katılımcının giriş yapıp yapmadığı
  - `checked_in_at` (timestamptz): Giriş zamanı
  - `checked_in_by` (uuid): Girişi işleyen yönetici üye ID'si

  ### 3. İndeks
  - event_id + member_id üzerinde hızlı tarama için indeks

  ### 4. Güvenlik
  - Yöneticiler check-in alanlarını güncelleyebilir
*/

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS qr_checkin_enabled boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_participants' AND column_name = 'checked_in'
  ) THEN
    ALTER TABLE event_participants
      ADD COLUMN checked_in boolean NOT NULL DEFAULT false,
      ADD COLUMN checked_in_at timestamptz,
      ADD COLUMN checked_in_by uuid REFERENCES members(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_participants_checkin
  ON event_participants (event_id, member_id);

DROP POLICY IF EXISTS "Admins can update participant checkin" ON event_participants;

CREATE POLICY "Admins can update participant checkin"
  ON event_participants
  FOR UPDATE
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
