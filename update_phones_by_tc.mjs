import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Read and parse CSV (semicolon-separated)
const csvContent = fs.readFileSync('Kitap1.csv', 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  delimiter: ';'
});

// Build TC to Phone mapping
const tcPhoneMap = new Map();

for (const row of records) {
  const tcNo = (row['T.C. Kimlik No'] || row['TC_No'])?.trim();
  const phoneNo = (row['Telefon No'] || row['Telefon_No'])?.trim();

  // Skip invalid data
  if (!tcNo || !phoneNo || tcNo === 'T.C. Kimlik No') continue;

  // Skip scientific notation or too short numbers
  if (phoneNo.includes('e+') || phoneNo.includes('E+') || phoneNo.length < 10) {
    continue;
  }

  // Clean phone number
  let cleanPhone = phoneNo.replace(/[^\d]/g, '');

  // Turkish phone numbers should be 10 or 11 digits
  if (cleanPhone.length >= 10) {
    // If it starts with 0, keep it, otherwise add 0 prefix
    if (!cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '0' + cleanPhone;
    }
    // Trim to 11 digits max
    cleanPhone = cleanPhone.substring(0, 11);

    tcPhoneMap.set(tcNo, cleanPhone);
  }
}

console.log(`Found ${tcPhoneMap.size} valid TC-Phone mappings\n`);

// Update members table
let updatedCount = 0;
let notFoundCount = 0;
let errorCount = 0;

for (const [tcNo, phoneNo] of tcPhoneMap.entries()) {
  try {
    // Check if member exists with this TC number
    const { data: members, error: selectError } = await supabase
      .from('members')
      .select('id, full_name, phone')
      .eq('tc_identity_no', tcNo);

    if (selectError) {
      throw selectError;
    }

    if (members && members.length > 0) {
      const member = members[0];
      const oldPhone = member.phone || 'N/A';

      // Only update if phone is different
      if (oldPhone !== phoneNo) {
        const { error: updateError } = await supabase
          .from('members')
          .update({ phone: phoneNo })
          .eq('tc_identity_no', tcNo);

        if (updateError) {
          throw updateError;
        }

        updatedCount++;
        console.log(`✓ Updated ${member.full_name} (TC: ${tcNo}): ${oldPhone} → ${phoneNo}`);
      }
    } else {
      notFoundCount++;
    }
  } catch (error) {
    errorCount++;
    console.error(`✗ Error updating TC ${tcNo}:`, error.message);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Total TC-Phone mappings in CSV: ${tcPhoneMap.size}`);
console.log(`Successfully updated: ${updatedCount}`);
console.log(`Not found in database: ${notFoundCount}`);
console.log(`Errors: ${errorCount}`);
