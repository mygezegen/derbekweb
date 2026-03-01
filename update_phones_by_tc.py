#!/usr/bin/env python3
import csv
import os
from supabase import create_client, Client

# Read Supabase credentials from environment
supabase_url = os.environ.get('VITE_SUPABASE_URL')
supabase_key = os.environ.get('VITE_SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    print("Error: Missing Supabase credentials")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(supabase_url, supabase_key)

# Read CSV file
tc_phone_map = {}
with open('extracted_csv.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        tc_no = row.get('TC_No', '').strip()
        phone_no = row.get('Telefon_No', '').strip()

        # Skip header row and invalid data
        if tc_no == 'TC_No' or not tc_no or not phone_no:
            continue

        # Clean phone number (remove scientific notation issues)
        # If phone is in scientific notation like "5.32e+009", skip it
        if 'e+' in phone_no.lower() or len(phone_no) < 10:
            continue

        # Remove any non-digit characters except leading zeros
        clean_phone = ''.join(c for c in phone_no if c.isdigit())

        # Turkish phone numbers should be 10 or 11 digits
        if len(clean_phone) >= 10:
            # If it starts with 0, keep it, otherwise it's just the mobile part
            if not clean_phone.startswith('0') and len(clean_phone) == 10:
                clean_phone = '0' + clean_phone

            tc_phone_map[tc_no] = clean_phone

print(f"Found {len(tc_phone_map)} valid TC-Phone mappings")

# Update members table
updated_count = 0
not_found_count = 0
error_count = 0

for tc_no, phone_no in tc_phone_map.items():
    try:
        # Check if member exists with this TC number
        result = supabase.table('members').select('id, full_name, phone').eq('tc_identity_no', tc_no).execute()

        if result.data and len(result.data) > 0:
            member = result.data[0]
            old_phone = member.get('phone', 'N/A')

            # Update phone number
            update_result = supabase.table('members').update({
                'phone': phone_no
            }).eq('tc_identity_no', tc_no).execute()

            if update_result.data:
                updated_count += 1
                print(f"✓ Updated {member['full_name']} (TC: {tc_no}): {old_phone} → {phone_no}")
        else:
            not_found_count += 1

    except Exception as e:
        error_count += 1
        print(f"✗ Error updating TC {tc_no}: {str(e)}")

print(f"\n=== Summary ===")
print(f"Total TC-Phone mappings in CSV: {len(tc_phone_map)}")
print(f"Successfully updated: {updated_count}")
print(f"Not found in database: {not_found_count}")
print(f"Errors: {error_count}")
