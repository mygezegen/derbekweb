/*
  # Expand Survey Question Types

  ## Problem
  The survey_questions table only allowed: single_choice, multiple_choice, text, rating
  But the frontend uses: text, textarea, radio, checkbox, select, rating, date

  ## Fix
  Drop the old check constraint and add a new one that includes all frontend types.
*/

ALTER TABLE survey_questions DROP CONSTRAINT IF EXISTS survey_questions_question_type_check;

ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_type_check
  CHECK (question_type = ANY (ARRAY[
    'text'::text,
    'textarea'::text,
    'radio'::text,
    'checkbox'::text,
    'select'::text,
    'rating'::text,
    'date'::text,
    'single_choice'::text,
    'multiple_choice'::text
  ]));
