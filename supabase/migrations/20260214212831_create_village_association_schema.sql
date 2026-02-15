/*
  # Village Association Database Schema

  ## Summary
  Creates a complete database schema for village association management with 700+ members.
  Includes tables for members, announcements, events, and admin features.

  ## New Tables
  1. `members` - User profiles with basic member information
  2. `announcements` - News and announcements for all members
  3. `events` - Meetings, gatherings, and community events
  4. `admin_settings` - Configuration and metadata

  ## Security
  - RLS enabled on all tables
  - Authenticated members can view public data
  - Admins can manage content
  - Only admins can create announcements and events
*/

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
);

-- Create admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for members
CREATE POLICY "Members can view all members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- RLS Policies for announcements
CREATE POLICY "Members can view all announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = announcements.created_by
      AND members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = announcements.created_by
      AND members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = announcements.created_by
      AND members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = announcements.created_by
      AND members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- RLS Policies for events
CREATE POLICY "Members can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = events.created_by
      AND members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = events.created_by
      AND members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = events.created_by
      AND members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = events.created_by
      AND members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- RLS Policies for admin settings
CREATE POLICY "Everyone can view admin settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only first admin can update settings"
  ON admin_settings FOR UPDATE
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