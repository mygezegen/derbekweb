/*
  # Create get_email_by_tc RPC Function

  This function allows unauthenticated users to look up an email by TC identity number.
  It is used during the login process when users choose to login with their TC number.

  - Only returns the email field (no other member data is exposed)
  - SECURITY DEFINER runs with elevated privileges, bypassing RLS
  - Safe to expose publicly since it only returns email for a valid TC number
*/

CREATE OR REPLACE FUNCTION get_email_by_tc(p_tc_identity_no text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM members
  WHERE tc_identity_no = p_tc_identity_no
    AND email IS NOT NULL
  LIMIT 1;

  RETURN v_email;
END;
$$;

ALTER FUNCTION get_email_by_tc(text) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION get_email_by_tc(text) TO anon;
GRANT EXECUTE ON FUNCTION get_email_by_tc(text) TO authenticated;
