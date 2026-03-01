import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('remaining_updates.sql', 'utf-8');
const updates = sql.trim().split('\n').filter(line => line.trim() && line.startsWith('UPDATE'));

console.log(`Processing ${updates.length} updates (starting from update #51)...`);

let completed = 0;
let errors = 0;
const BATCH_SIZE = 50;

for (let i = 0; i < updates.length; i += BATCH_SIZE) {
  const batch = updates.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;

  console.log(`\nBatch ${batchNum}/${Math.ceil(updates.length / BATCH_SIZE)} (${batch.length} updates)...`);

  for (const updateSql of batch) {
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
          console.error(`  ✗ TC ${tcNo}: ${error.message}`);
          errors++;
        } else {
          completed++;
        }
      } catch (err) {
        console.error(`  ✗ TC ${tcNo}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`  Completed: ${completed}, Errors: ${errors}`);
}

console.log(`\n=== Final Summary ===`);
console.log(`Total attempted: ${updates.length}`);
console.log(`Successfully completed: ${completed}`);
console.log(`Errors: ${errors}`);
console.log(`\nGrand total with first 100: ${completed + 100} phone numbers updated`);
