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

// Create a map by name and registry number
const csvMap = new Map();
for (const record of records) {
  if (record.TC_No && record.TC_No !== '00000000000') {
    const key = record.Ad_Soyad?.trim().toUpperCase();
    if (key) {
      csvMap.set(key, record.TC_No);
    }
  }
}

console.log(`Mapped ${csvMap.size} unique names with valid TC`);

// Get members with fake TC
const { data: membersWithFakeTC } = await supabase
  .from('members')
  .select('id, full_name, email, tc_identity_no')
  .eq('tc_identity_no', '00000000000');

console.log(`Found ${membersWithFakeTC?.length || 0} members with fake TC in DB`);

if (!membersWithFakeTC || membersWithFakeTC.length === 0) {
  console.log('No members to update (might be RLS blocking)');
  process.exit(0);
}

// Match by name
let updated = 0;
let notFound = 0;

for (const member of membersWithFakeTC) {
  const nameKey = member.full_name?.trim().toUpperCase();

  if (!nameKey) {
    notFound++;
    continue;
  }

  const tcNumber = csvMap.get(nameKey);

  if (!tcNumber) {
    console.log(`! No match for: ${member.full_name}`);
    notFound++;
    continue;
  }

  // Update
  const { error } = await supabase
    .from('members')
    .update({ tc_identity_no: tcNumber })
    .eq('id', member.id);

  if (error) {
    console.error(`✗ ${member.full_name}: ${error.message}`);
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
