/*
  # Envanter Yönetim Sistemi

  ## Yeni Tablolar

  ### inventory_categories
  - Ana ve alt kategori desteği (parent_id ile hiyerarşi)
  - id, name, parent_id, description, created_at

  ### inventory_items
  - Ürün/eşya kayıtları
  - id, name, category_id, quantity, available_quantity, location, status, image_url, description
  - donor_name (bağış yapan kişi), notes, created_by, created_at, updated_at

  ### inventory_assignments
  - Zimmet kayıtları (kime verildi, ne zaman, kaç adet)
  - id, item_id, assigned_to_member_id, assigned_to_name, quantity, assigned_at, due_date, returned_at, notes, created_by

  ### inventory_maintenance
  - Arıza / bakım takibi
  - id, item_id, reported_by, description, status (reported/in_progress/resolved), resolved_at, resolved_by, notes

  ### inventory_event_usage
  - Etkinlikte kullanım geçmişi
  - id, item_id, event_id, event_name, quantity, used_at, returned_at, notes, created_by

  ## Güvenlik
  - Tüm tablolarda RLS etkin
  - root/admin: tam erişim
  - üye: sadece görüntüleme
*/

-- =====================
-- INVENTORY CATEGORIES
-- =====================
CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES inventory_categories(id) ON DELETE SET NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON inventory_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update categories"
  ON inventory_categories FOR UPDATE
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

CREATE POLICY "Root can delete categories"
  ON inventory_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- Seed some default categories
INSERT INTO inventory_categories (name, description, display_order) VALUES
  ('Elektronik', 'Elektronik cihazlar ve ekipmanlar', 1),
  ('Mobilya', 'Masa, sandalye, dolap vb.', 2),
  ('Mutfak', 'Mutfak araç gereçleri', 3),
  ('Temizlik', 'Temizlik malzemeleri ve ekipmanları', 4),
  ('Etkinlik', 'Etkinlik ve organizasyon malzemeleri', 5),
  ('Spor', 'Spor ekipmanları', 6),
  ('Diğer', 'Diğer malzemeler', 7)
ON CONFLICT DO NOTHING;

-- =====================
-- INVENTORY ITEMS
-- =====================
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES inventory_categories(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  available_quantity integer NOT NULL DEFAULT 1,
  location text DEFAULT '',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
  image_url text DEFAULT '',
  description text DEFAULT '',
  donor_name text DEFAULT '',
  serial_number text DEFAULT '',
  purchase_date date,
  purchase_price numeric(12,2),
  notes text DEFAULT '',
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert items"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update items"
  ON inventory_items FOR UPDATE
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

CREATE POLICY "Root can delete items"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);

-- =====================
-- INVENTORY ASSIGNMENTS
-- =====================
CREATE TABLE IF NOT EXISTS inventory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  assigned_to_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  assigned_to_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  assigned_at timestamptz DEFAULT now(),
  due_date date,
  returned_at timestamptz,
  notes text DEFAULT '',
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments"
  ON inventory_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert assignments"
  ON inventory_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update assignments"
  ON inventory_assignments FOR UPDATE
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

CREATE POLICY "Root can delete assignments"
  ON inventory_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_inventory_assignments_item ON inventory_assignments(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_member ON inventory_assignments(assigned_to_member_id);

-- =====================
-- INVENTORY MAINTENANCE
-- =====================
CREATE TABLE IF NOT EXISTS inventory_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  reported_by uuid REFERENCES members(id) ON DELETE SET NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved')),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES members(id) ON DELETE SET NULL,
  resolution_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance"
  ON inventory_maintenance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert maintenance"
  ON inventory_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update maintenance"
  ON inventory_maintenance FOR UPDATE
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

CREATE POLICY "Root can delete maintenance"
  ON inventory_maintenance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_inventory_maintenance_item ON inventory_maintenance(item_id);

-- =====================
-- INVENTORY EVENT USAGE
-- =====================
CREATE TABLE IF NOT EXISTS inventory_event_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  used_at timestamptz DEFAULT now(),
  returned_at timestamptz,
  notes text DEFAULT '',
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_event_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view event usage"
  ON inventory_event_usage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert event usage"
  ON inventory_event_usage FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update event usage"
  ON inventory_event_usage FOR UPDATE
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

CREATE POLICY "Root can delete event usage"
  ON inventory_event_usage FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_inventory_event_usage_item ON inventory_event_usage(item_id);
