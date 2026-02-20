/*
  # Remove Duplicate Donation Trigger

  This migration removes the duplicate trigger that causes donations to be recorded twice.

  ## Problem
  - Two triggers exist on the donations table that both create transactions
  - This causes each donation to appear twice in treasury management

  ## Solution
  - Remove the duplicate trigger
  - Keep only one trigger for creating transactions from donations

  ## Changes
  1. Remove duplicate trigger: trigger_create_transaction_from_donation
  2. Keep: create_transaction_from_donation_trigger
*/

-- =====================================================
-- REMOVE DUPLICATE TRIGGER
-- =====================================================

-- Remove the duplicate trigger
DROP TRIGGER IF EXISTS trigger_create_transaction_from_donation ON public.donations;

-- Also remove the update_treasury_on_donation trigger as treasury is updated by transactions trigger
DROP TRIGGER IF EXISTS update_treasury_on_donation ON public.donations;