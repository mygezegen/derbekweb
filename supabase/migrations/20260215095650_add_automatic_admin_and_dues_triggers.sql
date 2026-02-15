/*
  # Otomatik İşlemler için Trigger'lar

  ## Yeni Özellikler
  
  1. İlk üye otomatik admin olur
     - Eğer sistemde hiç üye yoksa, kaydolan ilk kişi is_admin = true olur
  
  2. Yeni aidat oluşturulduğunda
     - Tüm aktif üyelere otomatik olarak member_dues kaydı oluşturulur
     - Status: 'pending' olarak başlar
  
  3. Updated_at otomatik güncellenir
     - Her update işleminde updated_at alanı otomatik güncellenir
*/

-- Function: İlk üyeyi admin yap
CREATE OR REPLACE FUNCTION make_first_member_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer bu ilk üye ise (id hariç başka üye yoksa)
  IF NOT EXISTS (
    SELECT 1 FROM members WHERE id != NEW.id
  ) THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: İlk üye otomatik admin
DROP TRIGGER IF EXISTS trigger_make_first_member_admin ON members;
CREATE TRIGGER trigger_make_first_member_admin
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION make_first_member_admin();

-- Function: Yeni aidat oluşturulduğunda tüm üyelere ekle
CREATE OR REPLACE FUNCTION create_member_dues_for_all()
RETURNS TRIGGER AS $$
BEGIN
  -- Tüm aktif üyeler için member_dues kaydı oluştur
  INSERT INTO member_dues (member_id, dues_id, status)
  SELECT id, NEW.id, 'pending'
  FROM members
  ON CONFLICT (member_id, dues_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Yeni aidat oluşturulduğunda
DROP TRIGGER IF EXISTS trigger_create_member_dues_for_all ON dues;
CREATE TRIGGER trigger_create_member_dues_for_all
  AFTER INSERT ON dues
  FOR EACH ROW
  EXECUTE FUNCTION create_member_dues_for_all();

-- Function: Updated_at otomatik güncelle
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: dues tablosu için updated_at
DROP TRIGGER IF EXISTS trigger_update_dues_updated_at ON dues;
CREATE TRIGGER trigger_update_dues_updated_at
  BEFORE UPDATE ON dues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: member_dues tablosu için updated_at
DROP TRIGGER IF EXISTS trigger_update_member_dues_updated_at ON member_dues;
CREATE TRIGGER trigger_update_member_dues_updated_at
  BEFORE UPDATE ON member_dues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: galleries tablosu için updated_at
DROP TRIGGER IF EXISTS trigger_update_galleries_updated_at ON galleries;
CREATE TRIGGER trigger_update_galleries_updated_at
  BEFORE UPDATE ON galleries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: event_participants tablosu için updated_at
DROP TRIGGER IF EXISTS trigger_update_event_participants_updated_at ON event_participants;
CREATE TRIGGER trigger_update_event_participants_updated_at
  BEFORE UPDATE ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();