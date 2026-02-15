/*
  # Create Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `title` (text) - Bildirim başlığı
      - `message` (text) - Bildirim mesajı
      - `type` (text) - email veya sms
      - `status` (text) - pending, sent, failed
      - `recipient_type` (text) - all, debtors, specific
      - `sent_by` (uuid) - Gönderen admin üye ID
      - `sent_at` (timestamptz) - Gönderim zamanı
      - `created_at` (timestamptz)
    
    - `notification_recipients`
      - `id` (uuid, primary key)
      - `notification_id` (uuid) - notifications tablosuna referans
      - `member_id` (uuid) - members tablosuna referans
      - `status` (text) - pending, sent, failed
      - `sent_at` (timestamptz)
      - `error_message` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Admins can view all notifications
    - Regular members can view their own notifications
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'sms')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('all', 'debtors', 'specific')),
  sent_by uuid REFERENCES members(id) ON DELETE SET NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update notifications"
  ON notifications FOR UPDATE
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

CREATE POLICY "Admins can view all notification recipients"
  ON notification_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Members can view their own notification recipients"
  ON notification_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.id = notification_recipients.member_id
    )
  );

CREATE POLICY "Admins can manage notification recipients"
  ON notification_recipients FOR ALL
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
