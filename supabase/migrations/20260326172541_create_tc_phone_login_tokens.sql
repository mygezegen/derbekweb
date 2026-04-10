/*
  # TC + Telefon ile Geçici Giriş Token Sistemi

  ## Özet
  TC kimlik numarası ve cep telefonu ile kimlik doğrulama yaparak geçici giriş
  token'ı oluşturmak için kullanılan tablo ve fonksiyonlar.

  ## Yeni Tablolar
  - `tc_phone_login_tokens`
    - `id` (uuid, primary key)
    - `user_id` (uuid) - Auth user ID
    - `member_id` (uuid) - Member table ID  
    - `token` (text, unique) - Geçici oturum token'ı
    - `token_hash` (text) - Token'ın hash'i (güvenli saklama için)
    - `sms_code` (text) - 6 haneli SMS doğrulama kodu
    - `phone_number` (text) - Telefon numarası
    - `expires_at` (timestamptz) - Token geçerlilik süresi (15 dakika)
    - `used_at` (timestamptz) - Kullanıldığı zaman
    - `created_at` (timestamptz)

  ## Güvenlik
  - RLS aktif, sadece service role erişebilir (edge function üzerinden)
  - Token 15 dakika sonra geçersiz
  - Her kullanımdan sonra işaretlenir
*/

CREATE TABLE IF NOT EXISTS public.tc_phone_login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  sms_code text NOT NULL,
  phone_number text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tc_phone_login_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tc_phone_login_tokens_phone ON public.tc_phone_login_tokens(phone_number);
CREATE INDEX IF NOT EXISTS idx_tc_phone_login_tokens_expires ON public.tc_phone_login_tokens(expires_at);

-- Cleanup expired tokens function
CREATE OR REPLACE FUNCTION public.cleanup_tc_phone_login_tokens()
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.tc_phone_login_tokens
  WHERE expires_at < now() - interval '1 hour';
END;
$function$;
