/*
  # Uye Sorgulama API Sistemi

  ## Aciklama
  Dis sistemlerin URL uzerinden uye durumunu sorgulayabilmesi icin guvenli bir
  API istemci yonetim sistemi. Her istemciye ozel API anahtari, IP kisitlamasi,
  rate limiting ve dinamik sablonlar ile cevap uretilebilir.

  ## Yeni Tablolar

  ### 1. api_clients
  Dis sistem istemcileri. Her birine benzersiz API anahtari atanir.
  - id: UUID
  - name: Istemci adi (ornegin: "Belediye Sistemi")
  - api_key: Benzersiz, guvenli API anahtari (SHA256 hash olarak saklanir)
  - api_key_prefix: Goruntuleme icin ilk 8 karakter
  - allowed_ips: Izin verilen IP adresleri listesi (bos = tum ipler)
  - rate_limit_count: Pencere basina max sorgu sayisi
  - rate_limit_window_minutes: Rate limit penceresi (dakika)
  - allowed_fields: Donulecek alanlar listesi (template bazli)
  - template_id: Hangi sablonu kullanacagi
  - is_active: Aktif/pasif durumu
  - description: Aciklama
  - created_by: Olusturan admin
  - created_at / updated_at

  ### 2. query_response_templates
  Admin tarafindan duzenlenbilir cevap sablonlari. Hangi alanlarin
  donecegini ve nasil formatlanacagini belirler.
  - id: UUID
  - name: Sablon adi
  - description: Aciklama
  - fields: JSON - donulecek alanlar ve etiketleri
  - is_default: Varsayilan sablon mu
  - created_by: Olusturan
  - created_at / updated_at

  ### 3. query_logs
  Her sorgu icin detayli log kaydi. Audit trail ve rate limit kontrolu icin.
  - id: UUID
  - client_id: Hangi istemci sorguladı
  - queried_tc: Sorgulanan TC kimlik no
  - ip_address: Sorgu yapan IP
  - user_agent: Tarayici/sistem bilgisi
  - found: Uye bulundu mu
  - response_fields: Hangi alanlar donuldu
  - status: success / rate_limited / invalid_key / invalid_ip / not_found / error
  - error_message: Hata mesaji
  - created_at: Sorgu zamani

  ## Guvenlik
  - RLS tum tablolar icin aktif
  - Yalnizca admin/root kullanicilar istemci ve sablon yonetebilir
  - query_logs yalnizca admin/root okuyabilir
  - Sorgular Edge Function uzerinden yapilir (servis rolü ile)
*/

CREATE TABLE IF NOT EXISTS query_response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  fields jsonb NOT NULL DEFAULT '[]',
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE query_response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select query_response_templates"
  ON query_response_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can insert query_response_templates"
  ON query_response_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update query_response_templates"
  ON query_response_templates FOR UPDATE
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

CREATE POLICY "Admins can delete query_response_templates"
  ON query_response_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE TABLE IF NOT EXISTS api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key_hash text NOT NULL UNIQUE,
  api_key_prefix text NOT NULL,
  allowed_ips text[] DEFAULT '{}',
  rate_limit_count integer NOT NULL DEFAULT 10,
  rate_limit_window_minutes integer NOT NULL DEFAULT 15,
  template_id uuid REFERENCES query_response_templates(id),
  is_active boolean DEFAULT true,
  description text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select api_clients"
  ON api_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can insert api_clients"
  ON api_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update api_clients"
  ON api_clients FOR UPDATE
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

CREATE POLICY "Admins can delete api_clients"
  ON api_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE TABLE IF NOT EXISTS query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES api_clients(id) ON DELETE SET NULL,
  client_name text,
  queried_tc text,
  ip_address text,
  user_agent text,
  found boolean DEFAULT false,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  response_fields text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select query_logs"
  ON query_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE INDEX IF NOT EXISTS idx_query_logs_client_id ON query_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_ip_address ON query_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_query_logs_status ON query_logs(status);
CREATE INDEX IF NOT EXISTS idx_api_clients_api_key_hash ON api_clients(api_key_hash);

INSERT INTO query_response_templates (name, description, fields, is_default)
VALUES (
  'Standart Uyelik Durumu',
  'Temel uyelik durumu ve isim bilgisi',
  '[
    {"key": "full_name", "label": "Ad Soyad", "enabled": true},
    {"key": "membership_status", "label": "Uyelik Durumu", "enabled": true},
    {"key": "is_active", "label": "Aktif Mi", "enabled": true},
    {"key": "member_since", "label": "Uyelik Baslangici", "enabled": false},
    {"key": "phone", "label": "Telefon", "enabled": false},
    {"key": "email", "label": "E-posta", "enabled": false},
    {"key": "address", "label": "Adres", "enabled": false},
    {"key": "occupation", "label": "Meslek", "enabled": false},
    {"key": "neighborhood", "label": "Mahalle/Koy", "enabled": false},
    {"key": "due_status", "label": "Aidat Durumu", "enabled": false}
  ]'::jsonb,
  true
);
