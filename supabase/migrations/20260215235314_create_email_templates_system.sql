/*
  # E-posta Şablonları Sistemi

  ## Yeni Tablolar
  
  ### 1. email_templates
  E-posta şablonlarını yönetmek için tablo
  - `id` (uuid, primary key)
  - `template_key` (text, unique) - Şablonun benzersiz anahtarı
  - `name` (text) - Şablon adı
  - `subject` (text) - E-posta konusu (değişkenler destekler)
  - `html_content` (text) - HTML içerik (değişkenler destekler)
  - `text_content` (text) - Düz metin içerik
  - `available_variables` (jsonb) - Kullanılabilir değişkenler listesi
  - `description` (text) - Şablon açıklaması
  - `is_active` (boolean) - Aktif mi?
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. email_logs
  Gönderilen e-postaların loglarını tutmak için
  - `id` (uuid, primary key)
  - `template_key` (text) - Kullanılan şablon
  - `recipient_email` (text) - Alıcı e-posta
  - `recipient_name` (text) - Alıcı ismi
  - `subject` (text) - E-posta konusu
  - `status` (text) - Durum: 'sent', 'failed'
  - `error_message` (text) - Hata mesajı (varsa)
  - `sent_by` (uuid) - Gönderen admin
  - `sent_at` (timestamptz)

  ## Güvenlik
  - RLS etkin
  - Admin politikaları
  - Audit log kaydı
  
  ## Önemli Notlar
  
  Bu migrasyon:
  1. E-posta şablonları için yeni tablo oluşturur
  2. E-posta gönderim logları için tablo oluşturur
  3. Varsayılan şablonları ekler
  4. Uygun RLS politikalarını uygular
*/

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text,
  available_variables jsonb DEFAULT '[]'::jsonb,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
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

CREATE POLICY "Authenticated users can view active templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_by uuid REFERENCES members(id),
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "System can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject, html_content, text_content, available_variables, description) VALUES
(
  'welcome_email',
  'Hoş Geldiniz E-postası',
  'Derneğimize Hoş Geldiniz, {{member_name}}!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Hoş Geldiniz!</h1>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #1f2937; margin-top: 0;">Merhaba {{member_name}},</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği''ne hoş geldiniz. Üyeliğiniz başarıyla oluşturulmuştur.
      </p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">Giriş Bilgileriniz:</h3>
        <p style="color: #4b5563; margin: 5px 0;"><strong>E-posta:</strong> {{email}}</p>
      </div>
      <p style="color: #4b5563; line-height: 1.6;">
        Artık derneğimizin tüm hizmetlerinden yararlanabilir, etkinliklere katılabilir ve duyuruları takip edebilirsiniz.
      </p>
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px;">Saygılarımızla,<br><strong style="color: #10b981;">Dernek Yönetimi</strong></p>
      </div>
    </div>
  </div>',
  'Hoş Geldiniz {{member_name}}! Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği''ne hoş geldiniz. Üyeliğiniz başarıyla oluşturulmuştur. Giriş e-postanız: {{email}}',
  '["member_name", "email"]'::jsonb,
  'Yeni üyelere gönderilen hoş geldiniz e-postası'
),
(
  'payment_reminder',
  'Ödeme Hatırlatma',
  'Aidat Ödeme Hatırlatması - {{member_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(to right, #dc2626, #b91c1c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Ödeme Hatırlatması</h1>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #1f2937; margin-top: 0;">Merhaba {{member_name}},</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        Bu e-posta, ödenmemiş aidat borcunuz hakkında size hatırlatma yapmak amacıyla gönderilmektedir.
      </p>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
        <h3 style="color: #991b1b; margin-top: 0;">Borç Detayları:</h3>
        <p style="color: #7f1d1d; margin: 5px 0;"><strong>Tutar:</strong> {{amount}} TL</p>
        <p style="color: #7f1d1d; margin: 5px 0;"><strong>Son Ödeme Tarihi:</strong> {{due_date}}</p>
      </div>
      <p style="color: #4b5563; line-height: 1.6;">
        Ödeme yapmak için lütfen dernek yönetimi ile iletişime geçiniz.
      </p>
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px;">Saygılarımızla,<br><strong style="color: #dc2626;">Dernek Yönetimi</strong></p>
      </div>
    </div>
  </div>',
  'Merhaba {{member_name}}, ödenmemiş aidat borcunuz: {{amount}} TL. Son ödeme tarihi: {{due_date}}. Ödeme yapmak için lütfen dernek yönetimi ile iletişime geçiniz.',
  '["member_name", "amount", "due_date"]'::jsonb,
  'Üyelere ödeme hatırlatması gönderilir'
),
(
  'event_announcement',
  'Etkinlik Duyurusu',
  'Yeni Etkinlik: {{event_title}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(to right, #2563eb, #1d4ed8); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Yeni Etkinlik!</h1>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #1f2937; margin-top: 0;">{{event_title}}</h2>
      <div style="color: #4b5563; line-height: 1.6; margin: 20px 0;">
        {{event_description}}
      </div>
      <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">Etkinlik Detayları:</h3>
        <p style="color: #1e3a8a; margin: 5px 0;"><strong>📅 Tarih:</strong> {{event_date}}</p>
        <p style="color: #1e3a8a; margin: 5px 0;"><strong>📍 Konum:</strong> {{event_location}}</p>
      </div>
      <p style="color: #4b5563; line-height: 1.6;">
        Sizleri aramızda görmekten mutluluk duyarız!
      </p>
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px;">Saygılarımızla,<br><strong style="color: #2563eb;">Dernek Yönetimi</strong></p>
      </div>
    </div>
  </div>',
  'Yeni Etkinlik: {{event_title}}. {{event_description}}. Tarih: {{event_date}}, Konum: {{event_location}}',
  '["event_title", "event_description", "event_date", "event_location"]'::jsonb,
  'Yeni etkinlik duyuruları için kullanılır'
),
(
  'general_announcement',
  'Genel Duyuru',
  '{{subject}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">{{title}}</h1>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="color: #4b5563; line-height: 1.6;">
        {{content}}
      </div>
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">Saygılarımızla,<br><strong style="color: #10b981;">Dernek Yönetimi</strong></p>
      </div>
    </div>
  </div>',
  '{{title}} - {{content}}',
  '["subject", "title", "content"]'::jsonb,
  'Genel duyurular için kullanılır'
),
(
  'bulk_notification',
  'Toplu Bilgilendirme',
  '{{subject}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(to right, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Önemli Duyuru</h1>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #1f2937; margin-top: 0;">Merhaba {{member_name}},</h2>
      <div style="color: #4b5563; line-height: 1.6; margin: 20px 0;">
        {{message}}
      </div>
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">Saygılarımızla,<br><strong style="color: #f59e0b;">Dernek Yönetimi</strong></p>
      </div>
    </div>
  </div>',
  'Merhaba {{member_name}}, {{message}}',
  '["member_name", "subject", "message"]'::jsonb,
  'Toplu bilgilendirme mesajları için kullanılır'
)
ON CONFLICT (template_key) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_key);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_template_updated_at()
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
    WHERE tgname = 'email_templates_updated_at'
  ) THEN
    CREATE TRIGGER email_templates_updated_at
      BEFORE UPDATE ON email_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_email_template_updated_at();
  END IF;
END $$;