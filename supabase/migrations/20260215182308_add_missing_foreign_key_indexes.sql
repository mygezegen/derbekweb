/*
  # Add Missing Foreign Key Indexes

  ## 1. Add Foreign Key Indexes
  Adds indexes for foreign key columns that are currently missing:
    - donations.created_by
    - donations.member_id
    - event_participants.member_id
    - member_dues.dues_id

  These indexes are essential for:
    - Fast JOIN operations
    - Efficient foreign key constraint checking
    - Better query performance on filtered queries
    - Preventing table locks during DELETE operations on parent tables

  Note: Some indexes may show as "unused" initially, but they are critical
  for maintaining good performance as data grows and for referential integrity operations.
*/

-- =====================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Index for donations.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_donations_created_by_fkey ON donations(created_by);

-- Index for donations.member_id foreign key
CREATE INDEX IF NOT EXISTS idx_donations_member_id_fkey ON donations(member_id);

-- Index for event_participants.member_id foreign key
CREATE INDEX IF NOT EXISTS idx_event_participants_member_id_fkey ON event_participants(member_id);

-- Index for member_dues.dues_id foreign key
CREATE INDEX IF NOT EXISTS idx_member_dues_dues_id_fkey ON member_dues(dues_id);