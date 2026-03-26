/*
  # Add discount configuration to query_response_templates

  ## Changes
  - `query_response_templates` tablosuna iki yeni kolon eklendi:
    - `discount_rate` (integer): İndirim hakki alan üyelere uygulanacak indirim yüzdesi (varsayılan: 50)
    - `discount_threshold` (numeric): İndirim hakkı için maksimum borç eşiği - bu tutarın altında borcu olanlar indirimden yararlanır (varsayılan: 700)

  ## Notlar
  - Mevcut şablonlarda varsayılan değerler kullanılır
  - Sabit kodlanmış eşik değeri (700 TL) artık template'den yönetilir
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_response_templates' AND column_name = 'discount_rate'
  ) THEN
    ALTER TABLE query_response_templates ADD COLUMN discount_rate integer NOT NULL DEFAULT 50;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_response_templates' AND column_name = 'discount_threshold'
  ) THEN
    ALTER TABLE query_response_templates ADD COLUMN discount_threshold numeric(10,2) NOT NULL DEFAULT 700;
  END IF;
END $$;
