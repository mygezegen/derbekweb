#!/bin/bash

export VITE_SUPABASE_URL='https://twktxzhsrobccqmheotf.supabase.co'
export VITE_SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a3R4emhzcm9iY2NxbWhlb3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODI4MTgsImV4cCI6MjA4Njc1ODgxOH0.AIrHUSnZVumPIKAPJDS0Ou9_obUkMm2_a7-jX0EF99c'

node -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runBatch(batchNum) {
  const filename = \`batch_phone_update_\${batchNum}.sql\`;
  if (!fs.existsSync(filename)) return { success: 0, failed: 0 };
  
  const sql = fs.readFileSync(filename, 'utf8');
  const updates = sql.trim().split(';').filter(u => u.trim());
  
  let success = 0;
  let failed = 0;
  
  for (const update of updates) {
    const match = update.match(/phone = '([^']+)'.*tc_identity_no = '([^']+)'/);
    if (match) {
      const [_, phone, tc] = match;
      const { error } = await supabase.from('members').update({ phone }).eq('tc_identity_no', tc);
      if (error) {
        failed++;
      } else {
        success++;
      }
    }
  }
  
  return { success, failed };
}

async function main() {
  console.log('Running remaining batches (3-11)...\\n');
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (let i = 3; i <= 11; i++) {
    process.stdout.write(\`Batch \${i}/11... \`);
    const result = await runBatch(i);
    totalSuccess += result.success;
    totalFailed += result.failed;
    console.log(\`✓ \${result.success} updated, \${result.failed} failed\`);
  }
  
  console.log(\`\\n=== Final Summary ===\`);
  console.log(\`Total updated: \${totalSuccess}\`);
  console.log(\`Total failed: \${totalFailed}\`);
}

main().catch(console.error);
"
