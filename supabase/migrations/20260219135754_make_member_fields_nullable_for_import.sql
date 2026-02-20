/*
  # Make optional member fields nullable
  
  Several fields that were marked NOT NULL have no data in the CSV import.
  Making them nullable to support importing members without complete data.
  Fields affected: address, profession, mother_name, father_name
*/

ALTER TABLE members
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN profession DROP NOT NULL,
  ALTER COLUMN mother_name DROP NOT NULL,
  ALTER COLUMN father_name DROP NOT NULL;
