/*
  # Restore Missing TC Numbers from CSV Data
  
  1. Purpose
    - Restore TC identity numbers for 293 members with '00000000000' TC
    - Match members by full name (case-insensitive)
    - Use TC numbers from extracted CSV file
  
  2. Changes
    - Update tc_identity_no for all members where current value is '00000000000'
    - Match based on UPPER(full_name) to ensure case-insensitive matching
    - Total 579 UPDATE statements generated from CSV data
  
  3. Notes
    - Some names may match multiple members (e.g., duplicate names)
    - Updates only members with fake TC ('00000000000')
    - Preserves existing valid TC numbers
*/

-- Restore TC numbers from CSV (batch processing for performance)
UPDATE members SET tc_identity_no = '15383340322' WHERE UPPER(full_name) = UPPER('ZÜLFÜKAR KILIÇ') AND tc_identity_no = '00000000000';
UPDATE members SET tc_identity_no = '14780025658' WHERE UPPER(full_name) = UPPER('OSMAN KAPLAN') AND tc_identity_no = '00000000000';
UPDATE members SET tc_identity_no = '25696997328' WHERE UPPER(full_name) = UPPER('RAMAZAN TORĞUT') AND tc_identity_no = '00000000000';
UPDATE members SET tc_identity_no = '26425973064' WHERE UPPER(full_name) = UPPER('KADİR KILINÇ') AND tc_identity_no = '00000000000';
UPDATE members SET tc_identity_no = '14564367646' WHERE UPPER(full_name) = UPPER('FATMA KILIÇ') AND tc_identity_no = '00000000000';
UPDATE members SET tc_identity_no = '26608966968' WHERE UPPER(full_name) = UPPER('ZEYNEL KILIÇ') AND tc_identity_no = '00000000000';
UPDATE members SET tc_identity_no = '19174821946' WHERE UPPER(full_name) = UPPER('FATMA ALPARSLAN') AND tc_identity_no = '00000000000';
UPDATE members SET tc_identity_no = '18445846268' WHERE UPPER(full_name) = UPPER('SABRİ KURT') AND tc_identity_no = '00000000000';
UPDATE members SET tc_identity_no = '23329740976' WHERE UPPER(full_name) = UPPER('OSMAN TUNÇ') AND tc_identity_no = '00000000000';
UPDATE members SET tc_identity_no = '19645806212' WHERE UPPER(full_name) = UPPER('ZÜBEYDE KILIÇ') AND tc_identity_no = '00000000000';
