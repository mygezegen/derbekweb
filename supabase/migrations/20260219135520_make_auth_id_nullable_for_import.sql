/*
  # Make auth_id nullable to support member import without auth accounts
  
  Members imported from CSV do not have auth accounts yet.
  auth_id can be linked later when they register.
*/

ALTER TABLE members ALTER COLUMN auth_id DROP NOT NULL;
