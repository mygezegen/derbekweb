/*
  # Yönetici Üye Güncelleme Yetkisi

  ## Sorun
  Yöneticiler diğer üyeleri yönetici yapamıyor çünkü members tablosunda sadece
  kendi profillerini güncelleyebiliyorlar.

  ## Çözüm
  1. Yeni Politika
    - Yöneticiler tüm üyeleri güncelleyebilir
    - is_admin alanı dahil tüm alanları değiştirebilirler
    - Sadece is_admin = true olan kullanıcılar bu yetkiye sahiptir

  ## Güvenlik
  - Yalnızca yönetici yetkisi olan kullanıcılar diğer üyeleri güncelleyebilir
  - Yönetici yetkisi members tablosundaki is_admin alanı ile kontrol edilir
  - Normal kullanıcılar sadece kendi profillerini güncelleyebilir (mevcut politika)
*/

-- Yöneticiler için üye güncelleme politikası
CREATE POLICY "Admins can update all members"
  ON members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.is_admin = true
    )
  );
