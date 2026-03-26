/*
  # Social Media Monitoring System

  ## Summary
  Creates tables for AI-powered social media monitoring: keyword/hashtag tracking, 
  account monitoring, and storing fetched trend results with analysis.

  ## New Tables

  ### social_monitor_keywords
  - Stores keywords and hashtags to track across platforms
  - Fields: id, keyword, platforms (array), is_active, created_by, created_at

  ### social_monitor_accounts
  - Stores social media accounts to monitor
  - Fields: id, platform, account_handle, display_name, is_active, created_by, created_at

  ### social_monitor_results
  - Stores fetched posts/trends from monitoring runs
  - Fields: id, source_type (keyword/account), source_id, platform, post_url, post_text,
    post_date, author_handle, engagement_score, sentiment (positive/neutral/negative),
    ai_summary, tags (array), fetched_at

  ### social_monitor_reports
  - Stores AI-generated trend reports for a time period
  - Fields: id, report_type, title, content, keywords_used, accounts_used,
    period_start, period_end, created_by, created_at

  ## Security
  - RLS enabled on all tables
  - Only admins can manage keywords and accounts
  - Admins can view all results and reports
*/

CREATE TABLE IF NOT EXISTS social_monitor_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  platforms text[] NOT NULL DEFAULT ARRAY['twitter','instagram','facebook'],
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_monitor_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view keywords"
  ON social_monitor_keywords FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can insert keywords"
  ON social_monitor_keywords FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update keywords"
  ON social_monitor_keywords FOR UPDATE
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

CREATE POLICY "Admins can delete keywords"
  ON social_monitor_keywords FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE TABLE IF NOT EXISTS social_monitor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('twitter','instagram','facebook','youtube','tiktok')),
  account_handle text NOT NULL,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(platform, account_handle)
);

ALTER TABLE social_monitor_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view accounts"
  ON social_monitor_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can insert accounts"
  ON social_monitor_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can update accounts"
  ON social_monitor_accounts FOR UPDATE
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

CREATE POLICY "Admins can delete accounts"
  ON social_monitor_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE TABLE IF NOT EXISTS social_monitor_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('keyword', 'account')),
  source_keyword text,
  source_account text,
  platform text NOT NULL,
  post_url text,
  post_text text,
  post_date timestamptz,
  author_handle text,
  author_name text,
  engagement_score integer DEFAULT 0,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  ai_summary text,
  tags text[],
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE social_monitor_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view results"
  ON social_monitor_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can insert results"
  ON social_monitor_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can delete results"
  ON social_monitor_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE TABLE IF NOT EXISTS social_monitor_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  report_type text NOT NULL DEFAULT 'trend_analysis',
  content text NOT NULL,
  keywords_used text[],
  accounts_used text[],
  period_start timestamptz,
  period_end timestamptz,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_monitor_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reports"
  ON social_monitor_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can insert reports"
  ON social_monitor_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can delete reports"
  ON social_monitor_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE INDEX IF NOT EXISTS idx_social_monitor_keywords_active ON social_monitor_keywords(is_active);
CREATE INDEX IF NOT EXISTS idx_social_monitor_accounts_platform ON social_monitor_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_monitor_results_fetched_at ON social_monitor_results(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_monitor_results_source ON social_monitor_results(source_type, source_keyword);
CREATE INDEX IF NOT EXISTS idx_social_monitor_reports_created_at ON social_monitor_reports(created_at DESC);
