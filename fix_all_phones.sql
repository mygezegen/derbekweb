-- Update all phone numbers that don't have proper format
-- Add leading 0 to phone numbers that start with 5 and are 10 digits

UPDATE members
SET phone = '0' || phone
WHERE phone LIKE '5%'
  AND LENGTH(phone) = 10
  AND tc_identity_no IN (
    SELECT tc_identity_no FROM (
      SELECT DISTINCT tc_identity_no
      FROM members
      WHERE phone LIKE '5%' AND LENGTH(phone) = 10
      LIMIT 500
    ) AS subquery
  );
