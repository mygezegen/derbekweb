import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read SQL file
const sql = readFileSync('./restore_tc_from_csv.sql', 'utf8');
const statements = sql.trim().split('\n').filter(line => line.trim());

console.log(`Total statements: ${statements.length}`);

// Execute in one batch via raw SQL
const batchSQL = statements.join('\n');

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: batchSQL });

  if (error) {
    console.error('Error:', error.message);
    console.log('Trying individual execution...');

    // Fall back to individual execution
    let updated = 0;
    for (const stmt of statements) {
      try {
        await supabase.rpc('exec_sql', { sql_query: stmt });
        updated++;
        if (updated % 50 === 0) {
          console.log(`✓ Progress: ${updated} statements executed`);
        }
      } catch (err) {
        console.error(`Failed: ${stmt.substring(0, 80)}...`);
      }
    }
    console.log(`\nCompleted: ${updated} statements`);
  } else {
    console.log('✓ All statements executed successfully');
  }
} catch (err) {
  console.error('Fatal error:', err.message);
}

// Check result
const { data: result } = await supabase
  .from('members')
  .select('tc_identity_no')
  .eq('tc_identity_no', '00000000000')
  .limit(1);

console.log(`\nRemaining fake TC count: ${result?.length || 'Unable to check (RLS)'}`);
