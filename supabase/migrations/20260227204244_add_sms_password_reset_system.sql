/*
  # SMS ile Şifre Sıfırlama Sistemi

  1. Değişiklikler
    - `password_reset_tokens` tablosuna yeni alanlar eklendi:
      - `reset_type` (text): 'email' veya 'sms'
      - `reset_code` (text, nullable): SMS ile gönderilen 6 haneli kod
      - `phone_number` (text, nullable): SMS gönderilen telefon numarası
      - `send_count` (integer): Kod kaç kez gönderildi (max 1)
      - `last_sent_at` (timestamptz): En son gönderim zamanı
      - `ip_address` (text, nullable): İstek yapılan IP adresi

  2. Güvenlik
    - Aynı kullanıcıya 30 dakika içinde sadece 1 defa kod gönderilebilir
    - Kodlar 30 dakika sonra otomatik olarak geçersiz olur
    - Kullanılan kodlar tekrar kullanılamaz

  3. Notlar
    - @uye.local gibi geçersiz e-posta adresleri için SMS kullanılır
    - Gerçek e-posta adresleri için e-posta kullanılır
    - Her iki yöntem de aynı token tablosunda saklanır
*/

-- Add new columns to password_reset_tokens table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_reset_tokens' AND column_name = 'reset_type'
  ) THEN
    ALTER TABLE password_reset_tokens 
      ADD COLUMN reset_type text DEFAULT 'email' CHECK (reset_type IN ('email', 'sms'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_reset_tokens' AND column_name = 'reset_code'
  ) THEN
    ALTER TABLE password_reset_tokens 
      ADD COLUMN reset_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_reset_tokens' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE password_reset_tokens 
      ADD COLUMN phone_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_reset_tokens' AND column_name = 'send_count'
  ) THEN
    ALTER TABLE password_reset_tokens 
      ADD COLUMN send_count integer DEFAULT 1 CHECK (send_count <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_reset_tokens' AND column_name = 'last_sent_at'
  ) THEN
    ALTER TABLE password_reset_tokens 
      ADD COLUMN last_sent_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_reset_tokens' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE password_reset_tokens 
      ADD COLUMN ip_address text;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_phone 
  ON password_reset_tokens(phone_number, expires_at) 
  WHERE reset_type = 'sms';

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_code 
  ON password_reset_tokens(reset_code, expires_at) 
  WHERE reset_type = 'sms' AND used_at IS NULL;

-- Function to check if user can request new reset code
CREATE OR REPLACE FUNCTION can_request_password_reset(
  p_user_id uuid,
  p_reset_type text
) RETURNS boolean AS $$
DECLARE
  v_last_request timestamptz;
BEGIN
  -- Get the last request time for this user
  SELECT last_sent_at INTO v_last_request
  FROM password_reset_tokens
  WHERE user_id = p_user_id 
    AND reset_type = p_reset_type
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no recent request or last request was more than 30 minutes ago
  IF v_last_request IS NULL OR v_last_request < (now() - interval '30 minutes') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and use reset code
CREATE OR REPLACE FUNCTION validate_password_reset_code(
  p_reset_code text,
  p_phone_number text
) RETURNS TABLE(
  user_id uuid,
  is_valid boolean,
  error_message text
) AS $$
DECLARE
  v_token_record password_reset_tokens%ROWTYPE;
BEGIN
  -- Find the reset token
  SELECT * INTO v_token_record
  FROM password_reset_tokens
  WHERE reset_code = p_reset_code
    AND phone_number = p_phone_number
    AND reset_type = 'sms'
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if token exists
  IF v_token_record.id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Geçersiz veya süresi dolmuş kod'::text;
    RETURN;
  END IF;

  -- Token is valid
  RETURN QUERY SELECT v_token_record.user_id, true, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON COLUMN password_reset_tokens.reset_type IS 'Type of password reset: email (link) or sms (code)';
COMMENT ON COLUMN password_reset_tokens.reset_code IS '6-digit code for SMS password reset';
COMMENT ON COLUMN password_reset_tokens.phone_number IS 'Phone number where SMS was sent';
COMMENT ON COLUMN password_reset_tokens.send_count IS 'Number of times the code was sent (max 1 per 30 minutes)';
COMMENT ON COLUMN password_reset_tokens.last_sent_at IS 'Last time the reset request was sent';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address of the requester for security tracking';
