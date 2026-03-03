import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// Read CSV
const csvContent = readFileSync('./extracted_csv.csv', 'utf8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true
});

console.log(`Found ${records.length} records in CSV`);

const updates = [];
let validTC = 0;
let invalidTC = 0;

for (const record of records) {
  if (!record.TC_No || record.TC_No === '00000000000' || !record.Ad_Soyad) {
    invalidTC++;
    continue;
  }

  validTC++;
  const name = record.Ad_Soyad.trim().replace(/'/g, "''");
  const tc = record.TC_No.trim();

  updates.push(
    `UPDATE members SET tc_identity_no = '${tc}' WHERE UPPER(full_name) = UPPER('${name}') AND tc_identity_no = '00000000000';`
  );
}

console.log(`Valid TC: ${validTC}`);
console.log(`Invalid TC: ${invalidTC}`);

writeFileSync('./restore_tc_from_csv.sql', updates.join('\n'));
console.log(`Saved ${updates.length} UPDATE statements to restore_tc_from_csv.sql`);
