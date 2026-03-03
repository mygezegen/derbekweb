import { readFileSync, writeFileSync } from 'fs';

// Parse members_insert.sql to extract TC numbers
const sql = readFileSync('./members_insert.sql', 'utf8');

// Extract all member data from INSERT statement
// Order: id, full_name, email, phone, address, is_active, registration_date, registry_number, tc_identity_no
const lines = sql.split('\n');
const members = [];

for (const line of lines) {
  if (!line.includes('gen_random_uuid()')) continue;

  // Extract values using a more robust approach
  const match = line.match(/\(gen_random_uuid\(\), '([^']+)', '([^']+)', '([^']+)', (?:NULL|'[^']*'), (?:true|false), (?:NULL|'[^']*'), '([^']+)', '([^']+)'/);

  if (match) {
    const [, fullName, email, phone, registryNumber, tcNumber] = match;
    members.push({
      fullName,
      email,
      phone,
      registryNumber,
      tcNumber
    });
  }
}

console.log(`Found ${members.length} members in SQL file`);

// Generate UPDATE statements for members with fake TC in original data
const updateStatements = [];
let realTCCount = 0;
let fakeTCCount = 0;

for (const member of members) {
  if (member.tcNumber !== '00000000000') {
    realTCCount++;
    updateStatements.push(
      `UPDATE members SET tc_identity_no = '${member.tcNumber}', phone = '${member.phone}' WHERE email = '${member.email}' AND tc_identity_no = '00000000000';`
    );
  } else {
    fakeTCCount++;
  }
}

console.log(`Real TC in original: ${realTCCount}`);
console.log(`Fake TC in original: ${fakeTCCount}`);
console.log(`Generated ${updateStatements.length} UPDATE statements`);

// Write to file
writeFileSync('./restore_tc_updates.sql', updateStatements.join('\n'));
console.log('Saved to restore_tc_updates.sql');
