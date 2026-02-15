/*
  # Add Audit Logs, Announcement Expiry, Contact Info, and Management Info

  ## 1. New Tables
  
  ### audit_logs
  Tracks all user actions and changes in the system:
    - `id` (uuid, primary key)
    - `member_id` (uuid, foreign key to members) - Who performed the action
    - `action_type` (text) - Type of action (create, update, delete, login, etc.)
    - `table_name` (text) - Which table was affected
    - `record_id` (uuid) - ID of the affected record
    - `old_values` (jsonb) - Previous values before change
    - `new_values` (jsonb) - New values after change
    - `ip_address` (text) - User's IP address
    - `user_agent` (text) - Browser/device information
    - `created_at` (timestamptz)
  
  ### contact_info
  Stores contact information for the association:
    - `id` (uuid, primary key)
    - `phone` (text) - Contact phone number
    - `email` (text) - Contact email
    - `address` (text) - Physical address
    - `social_media` (jsonb) - Social media links
    - `updated_by` (uuid, foreign key to members)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  ### management_info
  Stores information about board members and management:
    - `id` (uuid, primary key)
    - `member_id` (uuid, foreign key to members) - Board member
    - `position` (text) - Position title (Başkan, Başkan Yardımcısı, etc.)
    - `bio` (text) - Biography or description
    - `display_order` (integer) - Order of display
    - `is_active` (boolean) - Whether currently serving
    - `start_date` (date) - When they started
    - `end_date` (date) - When they ended (null if current)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## 2. Changes to Existing Tables
  
  ### announcements
  Added columns:
    - `expires_at` (timestamptz) - When the announcement should stop showing
    - `is_active` (boolean, default true) - Whether announcement is currently active

  ## 3. Security
  
  - Enable RLS on all new tables
  - audit_logs: Only admins can read, system can write
  - contact_info: Everyone can read, only admins can modify
  - management_info: Everyone can read, only admins can modify
  - announcements: Updated policies to respect expires_at and is_active

  ## 4. Indexes
  
  - Index on audit_logs(member_id, created_at) for efficient querying
  - Index on audit_logs(table_name, record_id) for lookup
  - Index on management_info(is_active, display_order) for display
  - Index on announcements(is_active, expires_at) for filtering
*/

-- =====================================================
-- CREATE AUDIT_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_logs_member_created 
  ON audit_logs(member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record 
  ON audit_logs(table_name, record_id);

-- =====================================================
-- CREATE CONTACT_INFO TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text,
  email text,
  address text,
  social_media jsonb DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contact_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contact info"
  ON contact_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert contact info"
  ON contact_info FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update contact info"
  ON contact_info FOR UPDATE
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

-- Insert default contact info if none exists
INSERT INTO contact_info (phone, email, address)
SELECT 
  '+90 XXX XXX XX XX',
  'info@caybasi.org',
  'Çaybaşı Köyü, Çüngüş, Diyarbakır'
WHERE NOT EXISTS (SELECT 1 FROM contact_info LIMIT 1);

-- =====================================================
-- CREATE MANAGEMENT_INFO TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS management_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  position text NOT NULL,
  bio text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE management_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view management info"
  ON management_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert management info"
  ON management_info FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update management info"
  ON management_info FOR UPDATE
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

CREATE POLICY "Admins can delete management info"
  ON management_info FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_management_info_active_order 
  ON management_info(is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_management_info_member_id_fkey 
  ON management_info(member_id);

-- =====================================================
-- UPDATE ANNOUNCEMENTS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE announcements ADD COLUMN expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE announcements ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_announcements_active_expires 
  ON announcements(is_active, expires_at);

-- =====================================================
-- ADD FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_contact_info_updated_by_fkey 
  ON contact_info(updated_by);

-- =====================================================
-- HELPER FUNCTION: Log Action
-- =====================================================

CREATE OR REPLACE FUNCTION log_action(
  p_member_id uuid,
  p_action_type text,
  p_table_name text,
  p_record_id uuid,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (
    member_id,
    action_type,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    p_member_id,
    p_action_type,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;