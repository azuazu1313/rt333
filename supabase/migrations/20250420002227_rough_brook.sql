/*
  # Fix is_admin function for RLS policies

  1. Changes
    - Define the is_admin() function to properly check if the current user has an admin role
    - The function checks the user_role column in the users table to determine if the authenticated user is an admin

  2. Security
    - This ensures that only users with the admin role can delete users
    - Fixes the permission denied error when attempting to delete users
*/

-- Drop the function if it exists to avoid errors
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND user_role = 'admin'::user_role
  );
$$;

-- Add comment to function
COMMENT ON FUNCTION public.is_admin() IS 'Checks if the current user has admin role';