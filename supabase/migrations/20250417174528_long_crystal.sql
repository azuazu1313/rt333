/*
  # Add Invite Links System
  
  1. New Tables
    - invite_links: Stores single-use signup invitation links
      - id (uuid, primary key)
      - code (text, unique)
      - role (user_role)
      - created_by (uuid)
      - expires_at (timestamptz)
      - used_at (timestamptz)
      - used_by (uuid)
      - created_at (timestamptz)
  
  2. Security
    - Enable RLS
    - Only allow admins to create and view invite links
*/

-- Create invite_links table
CREATE TABLE IF NOT EXISTS invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  role user_role NOT NULL,
  created_by uuid REFERENCES users(id) NOT NULL,
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage invite links
CREATE POLICY "Admins can manage invite links"
  ON invite_links
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX invite_links_code_idx ON invite_links(code);
CREATE INDEX invite_links_created_by_idx ON invite_links(created_by);

-- Add helpful comment
COMMENT ON TABLE invite_links IS 'Stores single-use signup invitation links';