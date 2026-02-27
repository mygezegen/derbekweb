/*
  # Etkinlikler INSERT Politikasını Düzelt
  
  1. Değişiklikler
    - INSERT politikasını güncelle: created_by member_id ile eşleşmeli
    - created_by alanını member_id referansına çevir
    
  2. Güvenlik
    - Sadece admin veya root yetkili kullanıcılar etkinlik ekleyebilir
    - created_by alanı members tablosundaki id'yi işaret eder
*/

-- Önce eski politikayı kaldır
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;

-- created_by kolonunu member_id'ye referans yapacak şekilde güncelle
-- Önce foreign key constraint'i kaldır
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;

-- created_by'ı members tablosuna referans yap
ALTER TABLE events ADD CONSTRAINT events_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

-- Yeni INSERT politikası: Kullanıcının member kaydı created_by ile eşleşmeli ve admin/root olmalı
CREATE POLICY "Admin and root users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = created_by
      AND members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );