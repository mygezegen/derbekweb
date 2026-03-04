#!/bin/bash

# Already applied first 50 from batch_1.sql lines 1-50
# Now apply remaining updates

echo "Applying remaining phone updates..."

# Get all UPDATE statements
grep "^UPDATE" phone_updates.sql | tail -n +51 > remaining_updates.sql

echo "Total remaining updates: $(wc -l < remaining_updates.sql)"

# Note: This file can be manually applied via Supabase dashboard or CLI
echo "File created: remaining_updates.sql"
echo "Apply this SQL file to complete the updates"
