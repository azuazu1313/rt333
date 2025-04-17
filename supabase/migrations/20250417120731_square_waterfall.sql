/*
  # Add User Suspension Feature

  1. Changes
     - Add is_suspended column to users table
     - Add default value of false
     - Update existing rows
     
  2. Security
     - Maintain existing RLS policies
*/

-- Add is_suspended column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- Update any existing rows to have is_suspended = false
UPDATE public.users
SET is_suspended = false
WHERE is_suspended IS NULL;

-- Add comment
COMMENT ON COLUMN public.users.is_suspended IS 'Indicates if the user account is suspended';