/*
  # api_clients tablosuna require_api_key kolonu ekle

  ## Degisiklik
  - api_clients.require_api_key: boolean, varsayilan true
    - true  -> API key zorunlu (mevcut davranis)
    - false -> API key gerekmez, sadece IP + rate limit kontrolu yapilir
      (Bu durumda allowed_ips dolu olmali, yoksa herkese acik olur)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_clients' AND column_name = 'require_api_key'
  ) THEN
    ALTER TABLE api_clients ADD COLUMN require_api_key boolean NOT NULL DEFAULT true;
  END IF;
END $$;
