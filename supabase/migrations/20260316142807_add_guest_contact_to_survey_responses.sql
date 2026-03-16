/*
  # Add Guest Contact Info to Survey Responses

  ## Changes
  - Adds `respondent_phone` column to survey_responses (for non-member respondents)
  - Adds `respondent_email` column to survey_responses (for non-member respondents)

  These fields are collected when a non-logged-in user fills out a survey,
  allowing the association to follow up with them.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'survey_responses' AND column_name = 'respondent_phone'
  ) THEN
    ALTER TABLE survey_responses ADD COLUMN respondent_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'survey_responses' AND column_name = 'respondent_email'
  ) THEN
    ALTER TABLE survey_responses ADD COLUMN respondent_email text;
  END IF;
END $$;
