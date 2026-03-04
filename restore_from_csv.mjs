import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Read CSV
const csvContent = readFileSync('./extracted_csv.csv', 'utf8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true
});

console.log(`Found ${records.length} records in CSV`);

// Get members with fake TC
const { data: membersWithFakeTC } = await supabase
  .from('members')
  .select('id, email, registry_number, tc_identity_no, phone')
  .eq('tc_identity_no', '00000000000');

console.log(`Found ${membersWithFakeTC.length} members with fake TC in DB`);

// Match by registry number (Uye_No)
let updated = 0;
let notFound = 0;

for (const member of membersWithFakeTC) {
  if (!member.registry_number) {
    notFound++;
    continue;
  }

  // Find in CSV by registry number
  const csvRecord = records.find(r => r.Uye_No === member.registry_number);

  if (!csvRecord || !csvRecord.TC_No || csvRecord.TC_No === '00000000000') {
    notFound++;
    continue;
  }

  // Update
  const { error } = await supabase
    .from('members')
    .update({ tc_identity_no: csvRecord.TC_No })
    .eq('id', member.id);

  if (error) {
    console.error(`✗ ${member.email}: ${error.message}`);
  } else {
    updated++;
    if (updated % 50 === 0) {
      console.log(`✓ Progress: ${updated} updated`);
    }
  }
}

console.log(`\n=== Summary ===`);
console.log(`Updated: ${updated}`);
console.log(`Not found: ${notFound}`);
