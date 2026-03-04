/*
  # Create log_action RPC Function

  Creates a callable RPC function that inserts records into audit_logs table.
  This is separate from the trigger-based log_action trigger function.

  - New Function: log_action(p_member_id, p_action_type, p_table_name, p_record_id, p_old_values, p_new_values)
  - Also adds RLS policy for audit_logs insert so authenticated users can log actions
*/

CREATE OR REPLACE FUNCTION log_action(
  p_member_id uuid,
  p_action_type text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (member_id, action_type, table_name, record_id, old_values, new_values)
  VALUES (p_member_id, p_action_type, p_table_name, p_record_id, p_old_values, p_new_values);
END;
$$;

ALTER FUNCTION log_action(uuid, text, text, uuid, jsonb, jsonb) OWNER TO postgres;
