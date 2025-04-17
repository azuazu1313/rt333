/*
  # Fix Invite Links Permissions

  1. Changes
    - Grant necessary permissions for invite_links table
    - Add policies for admin access
    - Add indexes for better performance

  2. Security
    - Maintain RLS
    - Only allow admin access
*/

-- Ensure RLS is enabled
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage invite links" ON invite_links;
DROP POLICY IF EXISTS "Admins can view all invite links" ON invite_links;
DROP POLICY IF EXISTS "Admins can insert invite links" ON invite_links;
DROP POLICY IF EXISTS "Admins can update invite links" ON invite_links;
DROP POLICY IF EXISTS "Admins can delete invite links" ON invite_links;

-- Create comprehensive policies for admin access
CREATE POLICY "Admins can view all invite links"
  ON invite_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert invite links"
  ON invite_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update invite links"
  ON invite_links
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete invite links"
  ON invite_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT ALL ON invite_links TO authenticated;
GRANT USAGE ON SEQUENCE invite_links_id_seq TO authenticated;

-- Add helpful comment
COMMENT ON TABLE invite_links IS 'Stores single-use signup invitation links with admin-only access';