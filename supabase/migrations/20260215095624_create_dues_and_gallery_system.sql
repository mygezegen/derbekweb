/*
  # Aidat ve Galeri Sistemi

  ## Yeni Tablolar
  
  ### 1. dues (Aidat Tanımları)
  - `id` (uuid, primary key)
  - `title` (text) - Örn: "2025 Mart Aidatı"
  - `amount` (numeric) - Aidat miktarı
  - `period_month` (integer) - Ay (1-12)
  - `period_year` (integer) - Yıl
  - `due_date` (date) - Son ödeme tarihi
  - `description` (text, nullable) - Açıklama
  - `created_by` (uuid) - Oluşturan admin
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. member_dues (Üye Aidat Kayıtları)
  - `id` (uuid, primary key)
  - `member_id` (uuid) - members tablosuna foreign key
  - `dues_id` (uuid) - dues tablosuna foreign key
  - `status` (text) - 'pending', 'paid', 'overdue'
  - `paid_amount` (numeric, default 0)
  - `paid_at` (timestamptz, nullable)
  - `payment_method` (text, nullable) - 'cash', 'bank_transfer', 'credit_card'
  - `notes` (text, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 3. galleries (Galeri Kategorileri)
  - `id` (uuid, primary key)
  - `title` (text)
  - `description` (text, nullable)
  - `is_public` (boolean, default false) - Herkese açık mı?
  - `cover_image_url` (text, nullable)
  - `created_by` (uuid)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 4. gallery_images (Galeri Fotoğrafları)
  - `id` (uuid, primary key)
  - `gallery_id` (uuid) - galleries tablosuna foreign key
  - `image_url` (text)
  - `caption` (text, nullable)
  - `display_order` (integer, default 0)
  - `created_by` (uuid)
  - `created_at` (timestamptz)
  
  ### 5. event_participants (Etkinlik Katılımcıları)
  - `id` (uuid, primary key)
  - `event_id` (uuid) - events tablosuna foreign key
  - `member_id` (uuid) - members tablosuna foreign key
  - `status` (text) - 'attending', 'not_attending', 'maybe'
  - `registered_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Güvenlik
  - RLS tüm tablolarda etkin
  - Adminler tüm işlemleri yapabilir
  - Üyeler sadece kendi kayıtlarını görebilir
  - Public galeriler herkes tarafından görülebilir
*/

-- Dues table
CREATE TABLE IF NOT EXISTS dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  period_month integer NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year integer NOT NULL,
  due_date date NOT NULL,
  description text,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view dues"
  ON dues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert dues"
  ON dues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update dues"
  ON dues FOR UPDATE
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

CREATE POLICY "Admins can delete dues"
  ON dues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

-- Member dues table
CREATE TABLE IF NOT EXISTS member_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  dues_id uuid NOT NULL REFERENCES dues(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_amount numeric(10, 2) DEFAULT 0,
  paid_at timestamptz,
  payment_method text CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'other')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, dues_id)
);

ALTER TABLE member_dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own dues"
  ON member_dues FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can insert member dues"
  ON member_dues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update member dues"
  ON member_dues FOR UPDATE
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

CREATE POLICY "Admins can delete member dues"
  ON member_dues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

-- Galleries table
CREATE TABLE IF NOT EXISTS galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  cover_image_url text,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public galleries viewable by all"
  ON galleries FOR SELECT
  TO authenticated
  USING (is_public = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert galleries"
  ON galleries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update galleries"
  ON galleries FOR UPDATE
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

CREATE POLICY "Admins can delete galleries"
  ON galleries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

-- Gallery images table
CREATE TABLE IF NOT EXISTS gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  display_order integer DEFAULT 0,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery images viewable based on gallery visibility"
  ON gallery_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM galleries 
      WHERE galleries.id = gallery_images.gallery_id 
      AND (galleries.is_public = true OR auth.uid() IS NOT NULL)
    )
  );

CREATE POLICY "Admins can insert gallery images"
  ON gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update gallery images"
  ON gallery_images FOR UPDATE
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

CREATE POLICY "Admins can delete gallery images"
  ON gallery_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

-- Event participants table
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'not_attending', 'maybe')),
  registered_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, member_id)
);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view event participants"
  ON event_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can manage own participation"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Members can update own participation"
  ON event_participants FOR UPDATE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

CREATE POLICY "Members can delete own participation"
  ON event_participants FOR DELETE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM members 
      WHERE members.auth_id = auth.uid() 
      AND members.is_admin = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_member_dues_member_id ON member_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_dues_id ON member_dues(dues_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_status ON member_dues(status);
CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_id ON gallery_images(gallery_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_member_id ON event_participants(member_id);
CREATE INDEX IF NOT EXISTS idx_dues_period ON dues(period_year, period_month);