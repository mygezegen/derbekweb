/*
  # Relax member field constraints to allow optional fields

  ## Problem
  When adding a new member without phone, TC identity, or gender, the insert
  fails due to check constraints requiring specific formats for those fields.
  Also phone and email are NOT NULL which prevents members without contact info.

  ## Changes
  - Drop phone format check constraint (allow null/empty)
  - Drop TC identity length/format check constraint (allow null/empty)
  - Drop gender enum check constraint (allow null/empty)
  - Make phone column nullable
  - Make email column nullable
  - Ensure tc_identity_no stays nullable
*/

-- Drop the restrictive check constraints
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_phone_valid;
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_tc_identity_no_length;
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_gender_check;

-- Make phone nullable (it was NOT NULL before)
ALTER TABLE public.members ALTER COLUMN phone DROP NOT NULL;

-- Make email nullable (it was NOT NULL before)
ALTER TABLE public.members ALTER COLUMN email DROP NOT NULL;

-- Add back softer constraints that only apply when value is present
ALTER TABLE public.members ADD CONSTRAINT members_phone_valid
  CHECK (phone IS NULL OR length(phone) = 0 OR length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10);

ALTER TABLE public.members ADD CONSTRAINT members_tc_identity_no_length
  CHECK (tc_identity_no IS NULL OR length(tc_identity_no) = 0 OR (length(tc_identity_no) = 11 AND tc_identity_no ~ '^[0-9]+$'));

ALTER TABLE public.members ADD CONSTRAINT members_gender_check
  CHECK (gender IS NULL OR length(gender) = 0 OR gender = ANY (ARRAY['male', 'female', 'other']));
