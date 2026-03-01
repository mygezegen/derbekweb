import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvContent = fs.readFileSync('extracted_csv.csv', 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_column_count: true
});

const tcPhoneMap = new Map();

for (const row of records) {
  const tcNo = row.TC_No?.trim();
  const phoneNo = row.Telefon_No?.trim();

  if (!tcNo || !phoneNo || tcNo === 'TC_No' || tcNo === 'Uye_No') continue;

  if (phoneNo.includes('e+') || phoneNo.includes('E+') || phoneNo.length < 10) {
    continue;
  }

  let cleanPhone = phoneNo.replace(/[^\d]/g, '');

  if (cleanPhone.length >= 10) {
    // Turkish phone numbers: take first 10 or 11 digits
    if (cleanPhone.startsWith('0')) {
      // Format: 0XXX XXX XX XX (11 digits total)
      cleanPhone = cleanPhone.substring(0, 11);
    } else if (cleanPhone.startsWith('5') || cleanPhone.startsWith('2')) {
      // Format: 5XX XXX XX XX (10 digits) - add leading 0
      cleanPhone = cleanPhone.substring(0, 10);
      cleanPhone = '0' + cleanPhone;
    } else {
      // Unknown format, skip
      continue;
    }

    // Validate: must be 11 digits and start with 0
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      tcPhoneMap.set(tcNo, cleanPhone);
    }
  }
}

console.log(`-- Found ${tcPhoneMap.size} valid TC-Phone mappings`);
console.log(`-- Generated SQL to update phone numbers by TC identity number\n`);

let updateCount = 0;

for (const [tcNo, phoneNo] of tcPhoneMap.entries()) {
  console.log(`UPDATE members SET phone = '${phoneNo}' WHERE tc_identity_no = '${tcNo}';`);
  updateCount++;
}

console.log(`\n-- Total updates: ${updateCount}`);
