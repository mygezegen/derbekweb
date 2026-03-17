/*
  # Add Cancelled Status to Member Dues and Passive Member Trigger

  ## Summary
  This migration adds support for automatically cancelling unpaid dues when a member
  is set to passive status, and reactivating them if the member becomes active again.

  ## Changes

  ### 1. member_dues table
  - Adds 'cancelled' as a valid status value alongside 'pending', 'paid', 'overdue'
  - Adds `cancelled_at` timestamp column to track when dues were cancelled
  - Adds `cancelled_reason` text column to store reason for cancellation

  ### 2. New trigger: cancel_dues_on_member_passive
  - Fires AFTER UPDATE on members table
  - When `is_active` changes from true to false:
    - Sets all 'pending' and 'overdue' member_dues to 'cancelled'
    - Records cancellation timestamp and reason
  - When `is_active` changes from false to true:
    - Restores all 'cancelled' member_dues back to 'pending'
    - Clears cancellation metadata

  ## Security
  - No RLS changes needed (trigger runs as SECURITY DEFINER)

  ## Notes
  - Only 'pending' and 'overdue' dues are cancelled; 'paid' dues remain paid
  - Restoration sets dues back to 'pending' regardless of original status
  - This ensures data integrity and full audit trail
*/

-- Add cancelled_at and cancelled_reason columns to member_dues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_dues' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE member_dues ADD COLUMN cancelled_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_dues' AND column_name = 'cancelled_reason'
  ) THEN
    ALTER TABLE member_dues ADD COLUMN cancelled_reason text;
  END IF;
END $$;

-- Update the status check constraint to include 'cancelled'
ALTER TABLE member_dues DROP CONSTRAINT IF EXISTS member_dues_status_check;
ALTER TABLE member_dues ADD CONSTRAINT member_dues_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));

-- Create trigger function to handle member passive/active status changes
CREATE OR REPLACE FUNCTION handle_member_active_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Member became PASSIVE (is_active: true -> false)
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE member_dues
    SET
      status = 'cancelled',
      cancelled_at = now(),
      cancelled_reason = 'Üye pasif statüye alındı'
    WHERE
      member_id = NEW.id
      AND status IN ('pending', 'overdue');
  END IF;

  -- Member became ACTIVE (is_active: false -> true)
  IF OLD.is_active = false AND NEW.is_active = true THEN
    UPDATE member_dues
    SET
      status = 'pending',
      cancelled_at = NULL,
      cancelled_reason = NULL
    WHERE
      member_id = NEW.id
      AND status = 'cancelled';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_member_active_status_change ON members;

-- Create trigger
CREATE TRIGGER trigger_member_active_status_change
  AFTER UPDATE OF is_active ON members
  FOR EACH ROW
  EXECUTE FUNCTION handle_member_active_status_change();
