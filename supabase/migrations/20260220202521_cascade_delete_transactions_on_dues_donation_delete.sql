/*
  # Cascade transaction cleanup on member_dues and donation delete/update

  ## Problem
  When a member_dues payment record is deleted, or a donation is deleted,
  the corresponding transaction in the transactions table remains (orphaned).
  This causes the treasury summary to show incorrect/stale totals.

  Also, when a donation amount is updated, the transaction amount needs to be
  updated as well (handled by create_transaction_from_donation trigger on UPDATE,
  already fixed in previous migration).

  ## Fix
  1. Add trigger on member_dues DELETE -> delete corresponding transaction
  2. Add trigger on donations DELETE -> delete corresponding transaction
  3. Add trigger on member_dues UPDATE when status changes away from 'paid' -> delete transaction
*/

-- Function to delete transaction when member_dues is deleted
CREATE OR REPLACE FUNCTION delete_transaction_on_dues_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.transactions
  WHERE reference_number = 'DUES-' || OLD.id::text;
  RETURN OLD;
END;
$$;

-- Drop and recreate trigger on member_dues DELETE
DROP TRIGGER IF EXISTS delete_transaction_on_dues_delete_trigger ON public.member_dues;
CREATE TRIGGER delete_transaction_on_dues_delete_trigger
  AFTER DELETE ON public.member_dues
  FOR EACH ROW
  EXECUTE FUNCTION delete_transaction_on_dues_delete();

-- Function to delete transaction when member_dues status changes from paid to non-paid
CREATE OR REPLACE FUNCTION handle_dues_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If status changed away from 'paid', remove the transaction
  IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    DELETE FROM public.transactions
    WHERE reference_number = 'DUES-' || NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_dues_status_change_trigger ON public.member_dues;
CREATE TRIGGER handle_dues_status_change_trigger
  AFTER UPDATE ON public.member_dues
  FOR EACH ROW
  EXECUTE FUNCTION handle_dues_status_change();

-- Function to delete transaction when donation is deleted
CREATE OR REPLACE FUNCTION delete_transaction_on_donation_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.transactions
  WHERE related_donation_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS delete_transaction_on_donation_delete_trigger ON public.donations;
CREATE TRIGGER delete_transaction_on_donation_delete_trigger
  AFTER DELETE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION delete_transaction_on_donation_delete();
