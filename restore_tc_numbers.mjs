import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse members_insert.sql to extract TC numbers
const sql = readFileSync('./members_insert.sql', 'utf8');

// Extract all member data from INSERT statement
// Order: id, full_name, email, phone, address, is_active, registration_date, registry_number, tc_identity_no
const insertPattern = /\(gen_random_uuid\(\), '([^']+)', '([^']+)', '([^']+)', [^,]+, [^,]+, '[^']*', '([^']+)', '([^']+)',/g;

const members = [];
let match;
while ((match = insertPattern.exec(sql)) !== null) {
  const [, fullName, email, phone, registryNumber, tcNumber] = match;
  members.push({
    fullName,
    email,
    phone,
    registryNumber,
    tcNumber
  });
}

console.log(`Found ${members.length} members in SQL file`);

// Get all members with 00000000000 TC from DB
const { data: membersWithFakeTC, error: fetchAllError } = await supabase
  .from('members')
  .select('id, email, full_name, tc_identity_no, phone')
  .eq('tc_identity_no', '00000000000');

if (fetchAllError) {
  console.error('Error fetching members:', fetchAllError.message);
  process.exit(1);
}

console.log(`Found ${membersWithFakeTC.length} members with fake TC in DB`);

// Create a map by email
const membersByEmail = new Map();
members.forEach(m => membersByEmail.set(m.email, m));

// Update members
let updated = 0;
let skipped = 0;

for (const dbMember of membersWithFakeTC) {
  const originalMember = membersByEmail.get(dbMember.email);

  if (!originalMember) {
    console.log(`! No match for ${dbMember.email}`);
    skipped++;
    continue;
  }

  if (originalMember.tcNumber === '00000000000') {
    console.log(`! Original also has fake TC: ${dbMember.email}`);
    skipped++;
    continue;
  }

  // Update with real TC
  const { error: updateError } = await supabase
    .from('members')
    .update({
      tc_identity_no: originalMember.tcNumber,
      phone: originalMember.phone
    })
    .eq('id', dbMember.id);

  if (updateError) {
    console.error(`✗ Error updating ${dbMember.email}:`, updateError.message);
  } else {
    updated++;
    console.log(`✓ ${dbMember.full_name} (${dbMember.email}) TC: ${originalMember.tcNumber}, Phone: ${originalMember.phone}`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);
