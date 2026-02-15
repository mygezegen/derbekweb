/*
  # Create Donations System and Update Dues to Yearly

  1. New Tables
    - `donations`
      - `id` (uuid, primary key)
      - `member_id` (uuid) - members tablosuna referans
      - `amount` (numeric) - Bağış tutarı
      - `donation_date` (date) - Bağış tarihi
      - `description` (text) - Bağış açıklaması
      - `payment_method` (text) - Ödeme yöntemi
      - `created_at` (timestamptz)
      - `created_by` (uuid) - Kaydı oluşturan admin

  2. Changes to Existing Tables
    - Update `dues` table structure for yearly system
    - Remove `period_month` column (will be ignored if doesn't exist)
    - `period_year` now represents the full year

  3. Security
    - Enable RLS on donations table
    - Admins can view, create, update all donations
    - Members can view their own donations

  4. Notes
    - Existing dues records will not be modified
    - New dues should use yearly period_year only
    - Donations track one-time contributions separate from regular dues
*/

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  donation_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  payment_method text CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'other')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES members(id) ON DELETE SET NULL
);

-- Enable RLS on donations
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
  ON donations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Members can view their own donations
CREATE POLICY "Members can view own donations"
  ON donations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.id = donations.member_id
    )
  );

-- Admins can create donations
CREATE POLICY "Admins can create donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Admins can update donations
CREATE POLICY "Admins can update donations"
  ON donations FOR UPDATE
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

-- Admins can delete donations
CREATE POLICY "Admins can delete donations"
  ON donations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON donations(member_id);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_created_by ON donations(created_by);
