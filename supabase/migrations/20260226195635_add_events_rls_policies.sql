/*
  # Add RLS Policies for Events Table

  1. Security Policies
    - Users can view all events (SELECT policy)
    - Users can create their own events (INSERT policy)
    - Users can update only their own events (UPDATE policy)
    - Users can delete only their own events (DELETE policy)
  
  2. Notes
    - All policies require authentication
    - created_by field automatically tracks event ownership
    - Users have full control over their own events
*/

-- Allow authenticated users to view all events
CREATE POLICY "Users can view all events"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create events
CREATE POLICY "Users can create their own events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow users to update only their own events
CREATE POLICY "Users can update their own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Allow users to delete only their own events
CREATE POLICY "Users can delete their own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);