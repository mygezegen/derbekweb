/*
  # Create Survey System

  ## Summary
  A complete survey/polling system that allows admins to create surveys with questions,
  members to submit responses, and optionally use QR codes to access surveys.

  ## New Tables

  ### surveys
  - `id` (uuid, pk): Unique survey ID
  - `title` (text): Survey title
  - `description` (text): Optional description shown to respondents
  - `created_by` (uuid → members): Admin who created it
  - `is_active` (boolean): Whether the survey accepts responses
  - `is_anonymous` (boolean): If true, responses are not linked to members
  - `qr_enabled` (boolean): Whether a QR code can be used to open the survey
  - `show_results_to_members` (boolean): Whether members can see aggregate results
  - `starts_at` (timestamptz): Optional open date
  - `ends_at` (timestamptz): Optional close date
  - `created_at` / `updated_at`

  ### survey_questions
  - `id` (uuid, pk)
  - `survey_id` (uuid → surveys)
  - `question_text` (text): The question
  - `question_type` (text): 'single_choice' | 'multiple_choice' | 'text' | 'rating'
  - `options` (jsonb): Array of option strings for choice questions
  - `is_required` (boolean)
  - `display_order` (int)

  ### survey_responses
  - `id` (uuid, pk): One per member per survey
  - `survey_id` (uuid → surveys)
  - `member_id` (uuid → members, nullable for anonymous)
  - `submitted_at` (timestamptz)

  ### survey_answers
  - `id` (uuid, pk)
  - `response_id` (uuid → survey_responses)
  - `question_id` (uuid → survey_questions)
  - `answer_text` (text, nullable): For text questions
  - `answer_options` (jsonb, nullable): Array of selected option indexes for choice questions
  - `answer_rating` (int, nullable): 1-5 for rating questions

  ## Security
  - All tables have RLS enabled
  - Admins can manage all surveys and see all responses
  - Members can view active surveys and submit responses
  - Anonymous surveys do not expose member identity
*/

CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_anonymous boolean NOT NULL DEFAULT false,
  qr_enabled boolean NOT NULL DEFAULT false,
  show_results_to_members boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'single_choice'
    CHECK (question_type IN ('single_choice', 'multiple_choice', 'text', 'rating')),
  options jsonb,
  is_required boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  answer_text text,
  answer_options jsonb,
  answer_rating int CHECK (answer_rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON survey_questions(survey_id, display_order);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_member_id ON survey_responses(member_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_response_id ON survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question_id ON survey_answers(question_id);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage surveys"
  ON surveys FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
    OR (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()))
  );

CREATE POLICY "Admins can insert surveys"
  ON surveys FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
  );

CREATE POLICY "Admins can update surveys"
  ON surveys FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
  );

CREATE POLICY "Admins can delete surveys"
  ON surveys FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
  );

CREATE POLICY "Authenticated users can view survey questions"
  ON survey_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
        AND (
          EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
          OR (surveys.is_active = true AND (surveys.starts_at IS NULL OR surveys.starts_at <= now()) AND (surveys.ends_at IS NULL OR surveys.ends_at >= now()))
        )
    )
  );

CREATE POLICY "Admins can manage survey questions"
  ON survey_questions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
  );

CREATE POLICY "Admins can update survey questions"
  ON survey_questions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
  );

CREATE POLICY "Admins can delete survey questions"
  ON survey_questions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
  );

CREATE POLICY "Members can view own responses, admins view all"
  ON survey_responses FOR SELECT TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
    OR EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
  );

CREATE POLICY "Authenticated users can submit responses"
  ON survey_responses FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Members can view own answers, admins view all"
  ON survey_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_responses sr
      WHERE sr.id = survey_answers.response_id
        AND (
          sr.member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
          OR EXISTS (SELECT 1 FROM members WHERE members.auth_id = auth.uid() AND (members.is_admin = true OR members.is_root = true))
        )
    )
  );

CREATE POLICY "Authenticated users can submit answers"
  ON survey_answers FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_surveys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_surveys_updated_at();
