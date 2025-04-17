/*
  # Fix admin permissions for trips and invite_links tables

  1. Changes
    - Add RLS policies for admin users to access trips table
    - Add RLS policies for admin users to manage invite links
    
  2. Security
    - Policies are restricted to users with admin role only
    - Maintains existing user-specific policies
*/

-- Add admin policies for trips table
CREATE POLICY "Admins can view all trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'::user_role
    )
  );

-- Add admin policies for invite_links table
CREATE POLICY "Admins can manage invite links"
  ON invite_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'::user_role
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
      AND users.role = 'admin'::user_role
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
      AND users.role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can view all invite links"
  ON invite_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'::user_role
    )
  );