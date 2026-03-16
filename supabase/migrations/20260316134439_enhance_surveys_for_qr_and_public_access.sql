/*
  # Enhance Surveys System for QR Code and Public Access

  ## Changes
  1. Add `status` column to surveys (draft/published/closed) - replaces is_active
  2. Add `allow_multiple_responses` column to surveys
  3. Add `respondent_name` to survey_responses for non-member respondents
  4. Update RLS to allow public (unauthenticated) access to published surveys and questions
  5. Update RLS to allow public submission of responses to published surveys
  6. Add policy for members to view published surveys

  ## Notes
  - The existing is_active column is kept for backwards compatibility
  - New status column provides more granular control: draft, published, closed
  - Public access is required for QR code sharing functionality
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surveys' AND column_name = 'status'
  ) THEN
    ALTER TABLE surveys ADD COLUMN status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surveys' AND column_name = 'allow_multiple_responses'
  ) THEN
    ALTER TABLE surveys ADD COLUMN allow_multiple_responses boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'survey_responses' AND column_name = 'respondent_name'
  ) THEN
    ALTER TABLE survey_responses ADD COLUMN respondent_name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'survey_responses' AND column_name = 'ip_hash'
  ) THEN
    ALTER TABLE survey_responses ADD COLUMN ip_hash text;
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage surveys" ON surveys;
DROP POLICY IF EXISTS "Public can view published surveys" ON surveys;
DROP POLICY IF EXISTS "Members can view published surveys" ON surveys;
DROP POLICY IF EXISTS "Public can view questions of published surveys" ON survey_questions;
DROP POLICY IF EXISTS "Public can submit responses to published surveys" ON survey_responses;
DROP POLICY IF EXISTS "Public can submit answers to published surveys" ON survey_answers;

CREATE POLICY "Public can view published surveys"
  ON surveys FOR SELECT
  TO public
  USING (status = 'published' AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "Public can view questions of published surveys"
  ON survey_questions FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_id
      AND surveys.status = 'published'
      AND (surveys.ends_at IS NULL OR surveys.ends_at > now())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can submit responses" ON survey_responses;
CREATE POLICY "Public can submit responses to published surveys"
  ON survey_responses FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_id
      AND surveys.status = 'published'
      AND (surveys.ends_at IS NULL OR surveys.ends_at > now())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can submit answers" ON survey_answers;
CREATE POLICY "Public can submit answers to published surveys"
  ON survey_answers FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_responses sr
      JOIN surveys s ON s.id = sr.survey_id
      WHERE sr.id = response_id
      AND s.status = 'published'
    )
  );

CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
