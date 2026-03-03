import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Read all SQL statements
const sql = readFileSync('./restore_tc_updates.sql', 'utf8');
const statements = sql.trim().split('\n');

console.log(`Processing ${statements.length} UPDATE statements...`);

let updated = 0;
let skipped = 0;
let errors = 0;

// Process in smaller batches to avoid timeouts
const batchSize = 50;
for (let i = 0; i < statements.length; i += batchSize) {
  const batch = statements.slice(i, i + batchSize);
  const batchSQL = batch.join('\n');

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: batchSQL });

    if (error) {
      // Try individual statements
      for (const stmt of batch) {
        const match = stmt.match(/email = '([^']+)'/);
        const email = match ? match[1] : 'unknown';

        const tcMatch = stmt.match(/tc_identity_no = '([^']+)'/);
        const phoneMatch = stmt.match(/phone = '([^']+)'/);
        const tc = tcMatch ? tcMatch[1] : '?';
        const phone = phoneMatch ? phoneMatch[1] : '?';

        // Direct update via Supabase client
        const { error: updateError } = await supabase
          .from('members')
          .update({ tc_identity_no: tc, phone: phone })
          .eq('email', email)
          .eq('tc_identity_no', '00000000000');

        if (updateError) {
          console.error(`✗ ${email}: ${updateError.message}`);
          errors++;
        } else {
          updated++;
          if (updated % 50 === 0) {
            console.log(`✓ Progress: ${updated} updated`);
          }
        }
      }
    } else {
      updated += batch.length;
      console.log(`✓ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} updates`);
    }
  } catch (err) {
    console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, err.message);
    errors += batch.length;
  }
}

console.log(`\n=== Final Summary ===`);
console.log(`Updated: ${updated}`);
console.log(`Errors: ${errors}`);
console.log(`Total: ${statements.length}`);
