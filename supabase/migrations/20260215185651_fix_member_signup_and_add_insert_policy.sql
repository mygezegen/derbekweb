/*
  # Üye Kayıt Sorunu Düzeltmesi ve RLS İyileştirmesi

  ## Sorun
  Yeni kullanıcılar kayıt olduğunda members tablosuna kayıt eklenemiyordu çünkü
  INSERT politikası yoktu.

  ## Çözüm
  1. Yeni Politikalar
    - Yeni kaydolan kullanıcılar kendi member kayıtlarını oluşturabilir
    - Sadece kendi auth_id'leri ile kayıt oluşturabilirler
    - is_admin alanı false olmalı (trigger zaten ilk üyeyi admin yapar)

  2. Güvenlik
    - Kullanıcılar sadece kendi auth_id'leri için kayıt oluşturabilir
    - is_admin false olarak ayarlanmalı (veya trigger tarafından yönetilir)
    - Email ve full_name zorunlu
*/

-- members tablosu için INSERT politikası ekle
-- Yeni kaydolan kullanıcılar kendi member kayıtlarını oluşturabilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'members' 
    AND policyname = 'Users can create own member profile'
  ) THEN
    CREATE POLICY "Users can create own member profile"
      ON members
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth_id = auth.uid() AND
        email IS NOT NULL AND
        full_name IS NOT NULL
      );
  END IF;
END $$;

-- Admins can insert members (for bulk operations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'members' 
    AND policyname = 'Admins can create member profiles'
  ) THEN
    CREATE POLICY "Admins can create member profiles"
      ON members
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM members m
          WHERE m.auth_id = auth.uid()
          AND m.is_admin = true
        )
      );
  END IF;
END $$;
