/*
  # Root Role and Comprehensive Permissions System

  1. New Tables
    - `permissions` - Defines all available permissions in the system
    - `role_permissions` - Maps permissions to roles (root/admin/member)
    
  2. Changes to Existing Tables
    - Add `is_root` column to members table
    - Only one root user can exist in the system
    
  3. Permissions Categories
    - Member Management (view, create, edit, delete members)
    - Financial Management (view, manage dues, payments, donations)
    - Content Management (announcements, events, gallery)
    - Settings Management (page settings, contact info, board members)
    - User Management (promote/demote admins, manage roles)
    
  4. Security
    - RLS policies to ensure only root can modify role permissions
    - RLS policies to ensure only root can promote to admin
    - Only root user can access certain sensitive areas
*/

-- Add is_root column to members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'is_root'
  ) THEN
    ALTER TABLE members ADD COLUMN is_root boolean DEFAULT false;
  END IF;
END $$;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('root', 'admin', 'member')),
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, permission_code)
);

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions table policies
CREATE POLICY "Anyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only root can manage permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- Role permissions table policies
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only root can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_root = true
    )
  );

-- Update members policies to include root checks
DROP POLICY IF EXISTS "Admins can update member info" ON members;
CREATE POLICY "Admins and root can update member info"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND (m.is_admin = true OR m.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND (m.is_admin = true OR m.is_root = true)
    )
  );

-- Only root can change is_admin and is_root flags
CREATE OR REPLACE FUNCTION check_root_only_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if is_admin or is_root is being changed
  IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin) OR (OLD.is_root IS DISTINCT FROM NEW.is_root) THEN
    -- Verify the user making the change is root
    IF NOT EXISTS (
      SELECT 1 FROM members
      WHERE auth_id = auth.uid()
      AND is_root = true
    ) THEN
      RAISE EXCEPTION 'Only root user can modify admin or root status';
    END IF;
    
    -- Ensure only one root user exists
    IF NEW.is_root = true AND OLD.is_root = false THEN
      IF EXISTS (
        SELECT 1 FROM members
        WHERE is_root = true
        AND id != NEW.id
      ) THEN
        RAISE EXCEPTION 'Only one root user can exist in the system';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_root_only_fields ON members;
CREATE TRIGGER enforce_root_only_fields
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION check_root_only_fields();

-- Insert default permissions
INSERT INTO permissions (code, name, description, category) VALUES
  -- Member Management
  ('members.view', 'Üyeleri Görüntüleme', 'Üye listesini ve bilgilerini görüntüleyebilir', 'member_management'),
  ('members.create', 'Üye Ekleme', 'Yeni üye ekleyebilir', 'member_management'),
  ('members.edit', 'Üye Düzenleme', 'Üye bilgilerini düzenleyebilir', 'member_management'),
  ('members.delete', 'Üye Silme', 'Üyeleri silebilir', 'member_management'),
  
  -- Financial Management
  ('finance.view', 'Mali Bilgileri Görüntüleme', 'Aidat, bağış ve ödemeleri görüntüleyebilir', 'financial_management'),
  ('finance.manage_dues', 'Aidat Yönetimi', 'Aidat planları oluşturabilir ve düzenleyebilir', 'financial_management'),
  ('finance.collect_payments', 'Ödeme Toplama', 'Üyelerden ödeme toplayabilir', 'financial_management'),
  ('finance.manage_donations', 'Bağış Yönetimi', 'Bağışları yönetebilir', 'financial_management'),
  ('finance.view_reports', 'Mali Raporlar', 'Detaylı mali raporları görüntüleyebilir', 'financial_management'),
  
  -- Content Management
  ('content.announcements', 'Duyuru Yönetimi', 'Duyuru ekleyebilir, düzenleyebilir ve silebilir', 'content_management'),
  ('content.events', 'Etkinlik Yönetimi', 'Etkinlik ekleyebilir, düzenleyebilir ve silebilir', 'content_management'),
  ('content.gallery', 'Galeri Yönetimi', 'Fotoğraf ve video ekleyebilir, düzenleyebilir ve silebilir', 'content_management'),
  
  -- Settings Management
  ('settings.page', 'Sayfa Ayarları', 'Sayfa başlığı, açıklama ve görsel ayarlarını düzenleyebilir', 'settings_management'),
  ('settings.contact', 'İletişim Bilgileri', 'İletişim bilgilerini düzenleyebilir', 'settings_management'),
  ('settings.board', 'Yönetim Kurulu', 'Yönetim kurulu üyelerini yönetebilir', 'settings_management'),
  ('settings.smtp', 'E-posta Ayarları', 'SMTP ayarlarını yapılandırabilir', 'settings_management'),
  ('settings.templates', 'E-posta Şablonları', 'E-posta şablonlarını düzenleyebilir', 'settings_management'),
  
  -- User Management (Root Only)
  ('admin.promote', 'Admin Yetkilendirme', 'Üyeleri admin yapabilir veya admin yetkisini kaldırabilir', 'user_management'),
  ('admin.permissions', 'Yetki Yönetimi', 'Rol bazlı yetkileri düzenleyebilir', 'user_management')
ON CONFLICT (code) DO NOTHING;

-- Insert default role permissions
-- Root has all permissions
INSERT INTO role_permissions (role, permission_code, enabled)
SELECT 'root', code, true
FROM permissions
ON CONFLICT (role, permission_code) DO NOTHING;

-- Admin has most permissions except user management
INSERT INTO role_permissions (role, permission_code, enabled)
SELECT 'admin', code, true
FROM permissions
WHERE category != 'user_management'
ON CONFLICT (role, permission_code) DO NOTHING;

-- Members have limited view permissions
INSERT INTO role_permissions (role, permission_code, enabled) VALUES
  ('member', 'members.view', true),
  ('member', 'finance.view', false),
  ('member', 'content.announcements', false),
  ('member', 'content.events', false),
  ('member', 'content.gallery', false)
ON CONFLICT (role, permission_code) DO NOTHING;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION has_permission(permission_code text)
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user's role
  SELECT 
    CASE 
      WHEN is_root THEN 'root'
      WHEN is_admin THEN 'admin'
      ELSE 'member'
    END INTO user_role
  FROM members
  WHERE auth_id = auth.uid();
  
  -- Check if role has permission
  RETURN EXISTS (
    SELECT 1
    FROM role_permissions
    WHERE role = user_role
    AND role_permissions.permission_code = has_permission.permission_code
    AND enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_is_root ON members(is_root) WHERE is_root = true;
CREATE INDEX IF NOT EXISTS idx_members_is_admin ON members(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_code);

-- Add updated_at trigger for role_permissions
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER set_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_updated_at();
