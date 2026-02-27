/*
  # Add member_id to board_members table

  1. Changes
    - Add `member_id` column to `board_members` table
      - Optional foreign key reference to `members` table
      - Allows linking board members to existing members
      - NULL allowed for non-member board positions

  2. Purpose
    - Enable selection of board members from existing member list
    - Maintain link between member records and board positions
    - Support both registered members and external board members
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'board_members' AND column_name = 'member_id'
  ) THEN
    ALTER TABLE board_members 
    ADD COLUMN member_id uuid REFERENCES members(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_board_members_member_id 
    ON board_members(member_id);
  END IF;
END $$;
