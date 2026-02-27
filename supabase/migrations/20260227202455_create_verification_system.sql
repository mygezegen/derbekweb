/*
  # SMS ve Kimlik Doğrulama Sistemi

  1. Yeni Tablolar
    - `sms_verification_codes`
      - SMS doğrulama kodlarını saklar
      - Kod, telefon numarası, süre sonu, kullanım durumu
    
    - `identity_verification_requests`
      - Kimlik doğrulama isteklerini saklar
      - Üye bilgileri, kimlik kartı fotoğrafı, doğrulama durumu
      - Doğum tarihi ve TC kimlik no doğrulaması için
    
    - `email_update_requests`
      - E-posta güncelleme isteklerini takip eder
      - SMS doğrulaması tamamlandıktan sonra e-posta güncellemeleri için
  
  2. Güvenlik
    - Tüm tablolarda RLS aktif
    - Üyeler sadece kendi kayıtlarını görebilir
    - Adminler tüm kayıtları yönetebilir
  
  3. İndeksler
    - Performans için gerekli indeksler eklendi
*/

-- SMS Doğrulama Kodları Tablosu
CREATE TABLE IF NOT EXISTS sms_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  verification_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_phone_format CHECK (phone_number ~ '^\+?[0-9]{10,15}$')
);

-- Kimlik Doğrulama İstekleri Tablosu
CREATE TABLE IF NOT EXISTS identity_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  id_card_front_url text NOT NULL,
  extracted_tc_identity_no text,
  extracted_birth_date date,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  admin_notes text,
  verified_by uuid REFERENCES members(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- E-posta Güncelleme İstekleri Tablosu
CREATE TABLE IF NOT EXISTS email_update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  old_email text NOT NULL,
  new_email text NOT NULL,
  sms_verified boolean DEFAULT false,
  identity_verified boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sms_verified', 'identity_verified', 'completed', 'rejected')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_email_format CHECK (new_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_sms_verification_member ON sms_verification_codes(member_id);
CREATE INDEX IF NOT EXISTS idx_sms_verification_phone ON sms_verification_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_verification_expires ON sms_verification_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_identity_verification_member ON identity_verification_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_identity_verification_status ON identity_verification_requests(verification_status);

CREATE INDEX IF NOT EXISTS idx_email_update_member ON email_update_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_email_update_status ON email_update_requests(status);

-- RLS Politikaları
ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_update_requests ENABLE ROW LEVEL SECURITY;

-- SMS Verification Codes Policies
CREATE POLICY "Users can view own SMS codes"
  ON sms_verification_codes FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can create own SMS codes"
  ON sms_verification_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  );

CREATE POLICY "Admins can view all SMS codes"
  ON sms_verification_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE auth_id = auth.uid() 
      AND (is_admin = true OR is_root = true)
    )
  );

-- Identity Verification Requests Policies
CREATE POLICY "Users can view own identity verification"
  ON identity_verification_requests FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can create own identity verification"
  ON identity_verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  );

CREATE POLICY "Admins can view all identity verifications"
  ON identity_verification_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE auth_id = auth.uid() 
      AND (is_admin = true OR is_root = true)
    )
  );

CREATE POLICY "Admins can update identity verifications"
  ON identity_verification_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE auth_id = auth.uid() 
      AND (is_admin = true OR is_root = true)
    )
  );

-- Email Update Requests Policies
CREATE POLICY "Users can view own email update requests"
  ON email_update_requests FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can create own email update requests"
  ON email_update_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update own email update requests"
  ON email_update_requests FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  );

CREATE POLICY "Admins can view all email update requests"
  ON email_update_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE auth_id = auth.uid() 
      AND (is_admin = true OR is_root = true)
    )
  );

CREATE POLICY "Admins can update all email update requests"
  ON email_update_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE auth_id = auth.uid() 
      AND (is_admin = true OR is_root = true)
    )
  );

-- Trigger: Update timestamp on changes
CREATE OR REPLACE FUNCTION update_verification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_identity_verification_timestamp
  BEFORE UPDATE ON identity_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_timestamp();

CREATE TRIGGER update_email_update_timestamp
  BEFORE UPDATE ON email_update_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_timestamp();

-- Storage bucket for ID cards (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ID cards
CREATE POLICY "Users can upload own ID cards"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'id-cards' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own ID cards"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'id-cards' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can view all ID cards"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'id-cards' AND
    EXISTS (
      SELECT 1 FROM members 
      WHERE auth_id = auth.uid() 
      AND (is_admin = true OR is_root = true)
    )
  );