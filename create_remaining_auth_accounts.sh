#!/bin/bash

# Script to create auth accounts for remaining members in batches

SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2)
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2)

BATCH_SIZE=30
OFFSET=0
TOTAL=310

echo "Creating auth accounts for $TOTAL members..."

while [ $OFFSET -lt $TOTAL ]; do
  echo "Processing batch at offset $OFFSET..."

  RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/sync-member-auth-accounts" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"batchSize\": $BATCH_SIZE, \"offset\": $OFFSET}")

  echo "$RESPONSE" | jq '.'

  SYNCED=$(echo "$RESPONSE" | jq -r '.synced')
  FAILED=$(echo "$RESPONSE" | jq -r '.failed')
  REMAINING=$(echo "$RESPONSE" | jq -r '.remaining')

  echo "Synced: $SYNCED, Failed: $FAILED, Remaining: $REMAINING"

  if [ "$REMAINING" = "0" ]; then
    echo "All members synced!"
    break
  fi

  OFFSET=$((OFFSET + BATCH_SIZE))

  # Wait a bit between batches to avoid rate limiting
  sleep 5
done

echo "Done!"
