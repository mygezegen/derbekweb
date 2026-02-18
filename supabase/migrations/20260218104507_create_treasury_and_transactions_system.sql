/*
  # Treasury and Transaction Management System

  ## Overview
  Complete financial management system for tracking all income and expenses including dues, donations, and other transactions.

  ## 1. New Tables
    
  ### `transaction_categories`
  - `id` (uuid, primary key)
  - `name` (text) - Category name (e.g., "Aidat", "Bağış", "Etkinlik Geliri", "Kira Gideri")
  - `type` (text) - "income" or "expense"
  - `description` (text, nullable)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz, default now())

  ### `transactions`
  - `id` (uuid, primary key)
  - `category_id` (uuid, foreign key to transaction_categories)
  - `member_id` (uuid, nullable, foreign key to members) - If related to a specific member
  - `amount` (numeric) - Transaction amount
  - `type` (text) - "income" or "expense"
  - `description` (text)
  - `transaction_date` (timestamptz)
  - `payment_method` (text) - "cash", "bank_transfer", "credit_card", "other"
  - `reference_number` (text, nullable) - Bank transfer reference, receipt number, etc.
  - `related_dues_id` (uuid, nullable, foreign key to dues) - Link to dues if applicable
  - `related_donation_id` (uuid, nullable, foreign key to donations) - Link to donation if applicable
  - `created_by` (uuid, foreign key to members)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ### `treasury_summary`
  - `id` (uuid, primary key)
  - `total_income` (numeric, default 0)
  - `total_expense` (numeric, default 0)
  - `current_balance` (numeric, default 0)
  - `last_updated` (timestamptz, default now())

  ## 2. Security
  - Enable RLS on all tables
  - Admins can manage all treasury and transaction data
  - Members can view their own transaction history
  - Public cannot access financial data

  ## 3. Triggers
  - Auto-update treasury_summary when transactions are added/updated/deleted
  - Auto-update timestamps on transaction updates
  - Auto-create transactions when dues or donations are paid

  ## 4. Indexes
  - Index on transaction_date for fast date range queries
  - Index on category_id for filtering by category
  - Index on member_id for member-specific queries
  - Index on type for income/expense filtering
*/

-- Create transaction_categories table
CREATE TABLE IF NOT EXISTS transaction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES transaction_categories(id) ON DELETE RESTRICT,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  description text NOT NULL,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'other')),
  reference_number text,
  related_dues_id uuid REFERENCES dues(id) ON DELETE SET NULL,
  related_donation_id uuid REFERENCES donations(id) ON DELETE SET NULL,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create treasury_summary table (single row table)
CREATE TABLE IF NOT EXISTS treasury_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_income numeric DEFAULT 0,
  total_expense numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- Insert initial treasury summary row if not exists
INSERT INTO treasury_summary (id, total_income, total_expense, current_balance)
SELECT gen_random_uuid(), 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM treasury_summary);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Enable RLS
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_categories
CREATE POLICY "Admins can manage transaction categories"
  ON transaction_categories FOR ALL
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

CREATE POLICY "Members can view active transaction categories"
  ON transaction_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for transactions
CREATE POLICY "Admins can manage all transactions"
  ON transactions FOR ALL
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

CREATE POLICY "Members can view their own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  );

-- RLS Policies for treasury_summary
CREATE POLICY "Admins can view treasury summary"
  ON treasury_summary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Function to update treasury summary
CREATE OR REPLACE FUNCTION update_treasury_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE treasury_summary
  SET
    total_income = (
      SELECT COALESCE(SUM(amount), 0)
      FROM transactions
      WHERE type = 'income'
    ),
    total_expense = (
      SELECT COALESCE(SUM(amount), 0)
      FROM transactions
      WHERE type = 'expense'
    ),
    current_balance = (
      SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
      FROM transactions
    ),
    last_updated = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update treasury summary on transaction changes
DROP TRIGGER IF EXISTS trigger_update_treasury_summary ON transactions;
CREATE TRIGGER trigger_update_treasury_summary
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_treasury_summary();

-- Function to update transaction updated_at
CREATE OR REPLACE FUNCTION update_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update transaction timestamp
DROP TRIGGER IF EXISTS trigger_update_transaction_timestamp ON transactions;
CREATE TRIGGER trigger_update_transaction_timestamp
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_timestamp();

-- Insert default transaction categories
INSERT INTO transaction_categories (name, type, description) VALUES
  ('Üye Aidatı', 'income', 'Üyelerden toplanan aylık/yıllık aidatlar'),
  ('Bağış', 'income', 'Üye ve bağışçılardan gelen bağışlar'),
  ('Etkinlik Geliri', 'income', 'Etkinliklerden elde edilen gelirler'),
  ('Diğer Gelirler', 'income', 'Diğer gelir kalemleri'),
  ('Kira Gideri', 'expense', 'Bina veya ofis kira ödemeleri'),
  ('Personel Gideri', 'expense', 'Personel maaş ve ödemeler'),
  ('Etkinlik Gideri', 'expense', 'Etkinlik organizasyon giderleri'),
  ('Bakım ve Onarım', 'expense', 'Bakım, onarım ve tadilat giderleri'),
  ('Kırtasiye ve Malzeme', 'expense', 'Ofis malzemeleri ve kırtasiye giderleri'),
  ('Diğer Giderler', 'expense', 'Diğer gider kalemleri')
ON CONFLICT DO NOTHING;

-- Function to auto-create transaction from dues payment
CREATE OR REPLACE FUNCTION create_transaction_from_dues()
RETURNS TRIGGER AS $$
DECLARE
  category_id uuid;
  admin_id uuid;
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD IS NULL OR OLD.payment_status != 'paid') THEN
    SELECT id INTO category_id
    FROM transaction_categories
    WHERE name = 'Üye Aidatı' AND type = 'income'
    LIMIT 1;

    SELECT id INTO admin_id
    FROM members
    WHERE is_admin = true
    LIMIT 1;

    INSERT INTO transactions (
      category_id,
      member_id,
      amount,
      type,
      description,
      transaction_date,
      payment_method,
      related_dues_id,
      created_by
    ) VALUES (
      category_id,
      NEW.member_id,
      NEW.amount,
      'income',
      'Aidat ödemesi - ' || TO_CHAR(NEW.due_date, 'Month YYYY'),
      COALESCE(NEW.payment_date, now()),
      COALESCE(NEW.payment_method, 'other'),
      NEW.id,
      admin_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create transaction from dues
DROP TRIGGER IF EXISTS trigger_create_transaction_from_dues ON dues;
CREATE TRIGGER trigger_create_transaction_from_dues
  AFTER INSERT OR UPDATE ON dues
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_from_dues();

-- Function to auto-create transaction from donation
CREATE OR REPLACE FUNCTION create_transaction_from_donation()
RETURNS TRIGGER AS $$
DECLARE
  category_id uuid;
  admin_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO category_id
    FROM transaction_categories
    WHERE name = 'Bağış' AND type = 'income'
    LIMIT 1;

    SELECT id INTO admin_id
    FROM members
    WHERE is_admin = true
    LIMIT 1;

    INSERT INTO transactions (
      category_id,
      member_id,
      amount,
      type,
      description,
      transaction_date,
      payment_method,
      related_donation_id,
      created_by
    ) VALUES (
      category_id,
      NEW.member_id,
      NEW.amount,
      'income',
      'Bağış - ' || COALESCE(NEW.notes, 'Bağışçı: ' || (SELECT full_name FROM members WHERE id = NEW.member_id)),
      NEW.donation_date,
      NEW.payment_method,
      NEW.id,
      admin_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create transaction from donation
DROP TRIGGER IF EXISTS trigger_create_transaction_from_donation ON donations;
CREATE TRIGGER trigger_create_transaction_from_donation
  AFTER INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_from_donation();