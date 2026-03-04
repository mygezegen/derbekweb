import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Find all batch files
const batchFiles = fs.readdirSync('.').filter(f => f.startsWith('batch_phone_')).sort();

console.log(`Found ${batchFiles.length} batch files\n`);

let totalUpdated = 0;
let totalErrors = 0;

for (const batchFile of batchFiles) {
  console.log(`Processing ${batchFile}...`);
  const sql = fs.readFileSync(batchFile, 'utf-8');
  const updates = sql.trim().split('\n').filter(line => line.trim());

  for (const updateSql of updates) {
    // Parse the SQL to extract phone and tc_identity_no
    const phoneMatch = updateSql.match(/phone = '([^']+)'/);
    const tcMatch = updateSql.match(/tc_identity_no = '([^']+)'/);

    if (phoneMatch && tcMatch) {
      const phone = phoneMatch[1];
      const tcNo = tcMatch[1];

      try {
        const { error } = await supabase
          .from('members')
          .update({ phone })
          .eq('tc_identity_no', tcNo);

        if (error) {
          console.error(`  ✗ Error updating TC ${tcNo}:`, error.message);
          totalErrors++;
        } else {
          totalUpdated++;
        }
      } catch (err) {
        console.error(`  ✗ Exception for TC ${tcNo}:`, err.message);
        totalErrors++;
      }
    }
  }

  console.log(`  Completed ${batchFile}\n`);
}

console.log(`\n=== Summary ===`);
console.log(`Total updated: ${totalUpdated}`);
console.log(`Total errors: ${totalErrors}`);
