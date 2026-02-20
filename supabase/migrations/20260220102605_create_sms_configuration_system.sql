/*
  # Create SMS Configuration System

  1. New Tables
    - `sms_config`
      - `id` (uuid, primary key)
      - `api_key` (text) - İletimerkezi API key
      - `api_hash` (text) - İletimerkezi API hash
      - `sender_name` (text) - SMS sender header (max 11 chars)
      - `is_active` (boolean) - SMS system enabled/disabled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sms_logs`
      - `id` (uuid, primary key)
      - `order_id` (text) - İletimerkezi order ID
      - `recipient` (text) - Phone number
      - `message` (text) - SMS content
      - `status` (text) - sent, failed, pending
      - `response_code` (text) - API response code
      - `response_message` (text) - API response message
      - `sent_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Only authenticated admins/root users can manage SMS config
    - SMS logs readable by admins/root users

  3. Important Notes
    - Only one SMS config record should exist (singleton pattern)
    - API credentials are sensitive and should be handled securely
    - SMS logs help track delivery status and troubleshoot issues
*/

-- Create SMS configuration table
CREATE TABLE IF NOT EXISTS sms_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text,
  api_hash text,
  sender_name text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text,
  recipient text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending',
  response_code text,
  response_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- SMS config policies (admin/root only)
CREATE POLICY "Admins and root can view SMS config"
  ON sms_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins and root can update SMS config"
  ON sms_config FOR UPDATE
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

CREATE POLICY "Admins and root can insert SMS config"
  ON sms_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

-- SMS logs policies (admin/root can view)
CREATE POLICY "Admins and root can view SMS logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "System can insert SMS logs"
  ON sms_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON sms_logs(recipient);

-- Insert default SMS config (inactive by default)
INSERT INTO sms_config (api_key, api_hash, sender_name, is_active)
VALUES ('', '', '', false)
ON CONFLICT DO NOTHING;